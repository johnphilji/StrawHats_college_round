import { buildPatchBranchName } from '../integrations/git/branch';
import { getPatchProvider, type PatchProvider } from '../integrations/llm/provider';
import { componentResolverService, type ComponentResolverService } from './component-resolver.service';
import { applyParsedDiff, normalizeUnifiedDiff, parseUnifiedDiff, serializeParsedDiff, validatePatchDiff } from './patch-validation.service';
import { buildStyleContext } from './style-context.service';
import { githubAppService, type GithubAppService } from './github-app.service';
import { projectsService } from '../modules/projects/projects.service';
import { patchesService } from '../modules/patches/patches.service';
import { workflowService } from '../modules/workflow/workflow.service';
import { AppError, conflict, validationError } from '../shared/errors/AppError';
import type { AuthenticatedUser } from '../shared/types/api';
import { logger } from '../config/logger';

type ProjectPort = Pick<typeof projectsService, 'getProjectById'>;
type PatchPort = Pick<typeof patchesService, 'get' | 'updateStatus'>;
type WorkflowPort = Pick<typeof workflowService, 'recordProposal' | 'recordGeneration' | 'recordValidation'>;
type GithubPort = Pick<GithubAppService, 'createPatchBranch' | 'readSource' | 'commitPatchFiles'>;

export interface PatchGenerationOptions {
  projects?: ProjectPort;
  patches?: PatchPort;
  workflow?: WorkflowPort;
  github?: GithubPort;
  resolver?: ComponentResolverService;
  provider?: PatchProvider;
}

interface WorkflowState {
  generationId?: string;
  outcome?: string;
  componentId?: string;
  filePath?: string;
  branchName?: string;
  baseCommitSha?: string;
  diff?: string;
  summary?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
}

function getWorkflowState(details: unknown): WorkflowState | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const workflow = (details as Record<string, unknown>).workflow;
  return workflow && typeof workflow === 'object' && !Array.isArray(workflow)
    ? workflow as WorkflowState
    : null;
}

function failureCategory(error: unknown): 'GENERATION_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT' | 'UNKNOWN' {
  if (error instanceof AppError && error.code === 'VALIDATION_ERROR') return 'VALIDATION_ERROR';
  if (error instanceof Error && (error.name === 'AbortError' || /timed? ?out/i.test(error.message))) return 'TIMEOUT';
  if (error instanceof AppError) return 'GENERATION_ERROR';
  return 'UNKNOWN';
}

function failureSummary(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Patch generation failed.';
  return message.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1_000) || 'Patch generation failed.';
}

export class PatchGenerationService {
  private readonly projects: ProjectPort;
  private readonly patches: PatchPort;
  private readonly workflow: WorkflowPort;
  private readonly github: GithubPort;
  private readonly resolver: ComponentResolverService;
  private readonly provider: PatchProvider;

  constructor(options: PatchGenerationOptions = {}) {
    this.projects = options.projects ?? projectsService;
    this.patches = options.patches ?? patchesService;
    this.workflow = options.workflow ?? workflowService;
    this.github = options.github ?? githubAppService;
    this.resolver = options.resolver ?? componentResolverService;
    this.provider = options.provider ?? getPatchProvider();
  }

  async generate(user: AuthenticatedUser, projectId: string, patchId: string, componentId: string) {
    const project = await this.projects.getProjectById(projectId, user.id);
    const repositoryId = project.repositoryIdentifier;
    if (!repositoryId || !/^\d{1,20}$/.test(repositoryId)) {
      throw new AppError('Connect this project to a GitHub repository before generating a patch.', {
        statusCode: 409,
        code: 'CONFLICT',
      });
    }
    if (this.provider.name !== 'groq') {
      throw new AppError('Persisted GitHub patch generation requires LLM_PROVIDER=groq.', {
        statusCode: 503,
        code: 'CONFIGURATION_ERROR',
      });
    }
    if (!process.env.GROQ_API_KEY?.trim()) {
      throw new AppError('Groq is not configured. Set GROQ_API_KEY on the backend.', {
        statusCode: 503,
        code: 'CONFIGURATION_ERROR',
      });
    }

    const entry = this.resolver.resolveComponent(componentId);
    let patch = await this.patches.get(projectId, patchId, user.id);
    let state = getWorkflowState(patch.validationDetails);
    let generationId: string;

    if (patch.status === 'DRAFT') {
      patch = await this.patches.updateStatus(projectId, patchId, user.id, 'GENERATING');
      state = getWorkflowState(patch.validationDetails);
      generationId = state?.generationId ?? '';
    } else if (patch.status === 'GENERATING' && state?.outcome === 'PENDING') {
      generationId = state.generationId ?? '';
    } else {
      throw conflict(`Patch cannot be generated from status ${patch.status}.`);
    }

    if (!generationId) throw new AppError('Patch generation attempt has no server-issued ID.', { statusCode: 500, code: 'INTERNAL_ERROR' });
    if (state?.componentId && state.componentId !== componentId) {
      throw conflict('This generation attempt is already bound to a different component.');
    }

    let commitCreated = false;
    try {
      const branchName = state?.branchName ?? buildPatchBranchName(componentId, generationId);
      let baseCommitSha = state?.baseCommitSha;
      let diff = state?.diff;
      let summary = state?.summary;
      let additions = state?.additions;
      let deletions = state?.deletions;

      if (!diff || !baseCommitSha || !summary || additions === undefined || deletions === undefined) {
        const branch = await this.github.createPatchBranch(user, repositoryId, {
          branchName,
          baseRef: state?.baseCommitSha ?? project.productionBranch,
        });
        baseCommitSha = branch.baseCommitSha;
        const source = await this.github.readSource(user, repositoryId, entry.filePath, baseCommitSha);
        if (source.path !== entry.filePath) throw conflict('GitHub returned source for a different path.');

        // Bounded read-only style guide so the generated change stays visually
        // consistent with the current page. Failures here never block the edit.
        let styleContext = '';
        try {
          styleContext = await buildStyleContext({
            componentFilePath: entry.filePath,
            sourceCode: source.source,
            reader: {
              readFile: async (filePath) => (await this.github.readSource(user, repositoryId, filePath, baseCommitSha)).source,
            },
          });
        } catch (styleError) {
          logger.warn(
            { projectId, patchId, componentId: entry.id, errorName: styleError instanceof Error ? styleError.name : 'unknown' },
            'Could not gather style context for persisted patch generation',
          );
        }

        const generated = await this.provider.generate({
          componentId: entry.id,
          instruction: patch.prompt,
          context: {
            componentId: entry.id,
            filePath: entry.filePath,
            componentName: entry.componentName,
            sourceCode: source.source,
            editableScope: entry.editableScope,
            allowedOperations: entry.allowedOperations,
            description: entry.description,
            framework: entry.framework,
            route: entry.route,
            dataSource: entry.dataSource,
            notes: entry.notes,
            styleContext,
          },
        });
        if (generated.errors?.length) throw validationError('Groq could not generate a usable patch.', { errors: generated.errors });
        if (!generated.diff) throw validationError('Groq returned an empty patch.');

        const normalizedDiff = normalizeUnifiedDiff(generated.diff, source.source);
        const validation = validatePatchDiff(normalizedDiff, entry.filePath, source.source);
        if (!validation.valid) throw validationError('Generated patch failed validation.', { errors: validation.errors });
        const normalizedDiff = normalizeUnifiedDiff(generated.diff, source.source);
        const validation = validatePatchDiff(normalizedDiff, entry.filePath, source.source);
        if (!validation.valid) throw validationError('Generated patch failed validation.', { errors: validation.errors });

        const parsed = parseUnifiedDiff(normalizedDiff, source.source).parsed;
        if (!parsed) throw validationError('Generated patch could not be parsed.');
        applyParsedDiff(source.source, parsed);

        diff = serializeParsedDiff(parsed);
        summary = generated.summary || `Update ${entry.componentName}`;
        additions = validation.addedLines;
        deletions = validation.removedLines;
        await this.workflow.recordProposal(projectId, patchId, generationId, {
          branchName,
          baseCommitSha,
          componentId: entry.id,
          filePath: entry.filePath,
          diff,
          summary,
          filesChanged: validation.changedFiles.length,
          additions,
          deletions,
        });
      }

      const source = await this.github.readSource(user, repositoryId, entry.filePath, baseCommitSha);
      if (source.path !== entry.filePath) throw conflict('GitHub returned source for a different path.');
      const validation = validatePatchDiff(diff, entry.filePath, source.source);
      if (!validation.valid) throw validationError('Saved patch no longer applies to its original base.', { errors: validation.errors });
      const parsed = parseUnifiedDiff(diff, source.source).parsed;
      if (!parsed) throw validationError('Saved patch could not be parsed.');
      const updatedSource = applyParsedDiff(source.source, parsed);

      const commit = await this.github.commitPatchFiles(user, repositoryId, {
        branchName,
        expectedHeadSha: baseCommitSha,
        idempotencyKey: generationId,
        message: `Patchwork: update ${entry.componentName}`.slice(0, 200),
        files: [{ path: entry.filePath, content: updatedSource }],
      });
      commitCreated = true;

      await this.workflow.recordGeneration(projectId, patchId, {
        type: 'generation',
        generationId,
        success: true,
        branchName,
        baseCommitSha,
        headCommitSha: commit.commitSha,
        summary,
        componentId: entry.id,
        filePath: entry.filePath,
        diff,
        filesChanged: 1,
        additions: additions ?? validation.addedLines,
        deletions: deletions ?? validation.removedLines,
      });
      await this.patches.updateStatus(projectId, patchId, user.id, 'VALIDATING');
      const readyForReview = await this.workflow.recordValidation(projectId, patchId, {
        type: 'validation',
        generationId,
        passed: true,
        results: [
          { name: 'authorized-single-file-diff', status: 'PASSED', summary: 'Diff path, hunk context, and size limits passed.' },
          { name: 'isolated-patch-application', status: 'PASSED', summary: 'Validated diff applied to the exact base source in memory.' },
          { name: 'application-build', status: 'SKIPPED', summary: 'No isolated dependency-install/build runner is configured.' },
        ],
      });

      return {
        patch: readyForReview,
        componentId: entry.id,
        componentName: entry.componentName,
        filePath: entry.filePath,
        diff,
        summary,
        provider: this.provider.name,
        simulated: false,
        validation,
        branchName,
        baseCommitSha,
        headCommitSha: commit.commitSha,
      };
    } catch (error) {
      if (!commitCreated) {
        try {
          await this.workflow.recordGeneration(projectId, patchId, {
            type: 'generation',
            generationId,
            success: false,
            failureCategory: failureCategory(error),
            errorSummary: failureSummary(error),
          });
        } catch (recordError) {
          logger.error({ projectId, patchId, generationId, errorName: recordError instanceof Error ? recordError.name : 'unknown' }, 'Could not persist patch generation failure');
        }
      }
      throw error;
    }
  }
}

export const patchGenerationService = new PatchGenerationService();