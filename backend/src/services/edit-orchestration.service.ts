import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { RepositoryProvider } from '../types/component.types';
import {
  ComponentResolverService,
  componentResolverService,
} from './component-resolver.service';
import { createDefaultRepositoryProvider } from './repository-provider.service';
import {
  applyParsedDiff,
  normalizeUnifiedDiff,
  parseUnifiedDiff,
  serializeParsedDiff,
  validatePatchDiff,
  type PatchValidationResult,
} from './patch-validation.service';
import {
  getPatchProvider,
  type PatchProvider,
} from '../integrations/llm/provider';
import { buildStyleContext } from './style-context.service';
import { logger } from '../config/logger';

/**
 * PATCHWORK local edit orchestration (Phases 5–6).
 *
 * Pipeline for one edit request:
 *   1. resolve the component ID through the trusted registry
 *      (unknown / non-editable IDs rejected here — never trust browser paths)
 *   2. read the current source from the configured local repository
 *   3. generate a proposed patch through the provider abstraction
 *      (mock fallback until a real LLM adapter is configured)
 *   4. validate patch syntax and file scope against the authorized file
 *   5. apply accepted hunks ONLY to an isolated temp copy (never the repo)
 *   6. re-read the repository file and prove it is unchanged
 *
 * Nothing in this pipeline merges, pushes, deploys, or executes model
 * output. Rejection is always safe: the target repository is never written.
 */

export interface EditProposal {
  componentId: string;
  componentName: string;
  /** Authorized repository-relative file (from the registry, never the client). */
  filePath: string;
  instruction: string;
  provider: string;
  /** Always true for the local mock — never present as real LLM output. */
  simulated: boolean;
  diff: string;
  changedFiles: string[];
  summary: string;
  validation: PatchValidationResult;
  /** True when hunks applied cleanly to the isolated copy. */
  isolatedPreviewApplied: boolean;
  /** True when the repository file hash is identical before/after. */
  targetUnchanged: boolean;
  providerWarnings: string[];
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export class EditOrchestrationService {
  private readonly resolver: ComponentResolverService;
  private readonly providerFactory: () => RepositoryProvider;
  private readonly patchProvider: PatchProvider;

  constructor(options?: {
    resolver?: ComponentResolverService;
    repositoryProvider?: RepositoryProvider;
    providerFactory?: () => RepositoryProvider;
    patchProvider?: PatchProvider;
  }) {
    this.resolver = options?.resolver ?? componentResolverService;
    if (options?.repositoryProvider) {
      const fixed = options.repositoryProvider;
      this.providerFactory = () => fixed;
    } else {
      this.providerFactory = options?.providerFactory ?? (() => createDefaultRepositoryProvider());
    }
    this.patchProvider = options?.patchProvider ?? getPatchProvider();
  }

  public async generateEditProposal(
    componentId: string,
    instruction: string,
  ): Promise<EditProposal> {
    // 1. Trusted resolution (rejects blank / unknown / non-editable IDs).
    const entry = this.resolver.resolveComponent(componentId);

    // 2. Current source from the configured local repository.
    const repository = this.providerFactory();
    const sourceCode = await repository.readFile(entry.filePath);
    const beforeHash = sha256(sourceCode);

    // 2b. Bounded read-only style guide so the patch stays visually consistent
    // with the current page. Missing/unreadable style files never block editing.
    let styleContext = '';
    try {
      styleContext = await buildStyleContext({
        componentFilePath: entry.filePath,
        sourceCode,
        reader: { readFile: (filePath) => repository.readFile(filePath) },
      });
      if (styleContext) {
        logger.info({ componentId: entry.id, styleContextChars: styleContext.length }, 'Style context gathered for editor proposal');
      }
    } catch (styleError) {
      logger.warn(
        { componentId: entry.id, errorName: styleError instanceof Error ? styleError.name : 'unknown' },
        'Could not gather style context for editor proposal',
      );
    }

    // 3. Provider generation (mock until a real adapter is configured).
    const generated = await this.patchProvider.generate({
      componentId: entry.id,
      instruction,
      context: {
        componentId: entry.id,
        filePath: entry.filePath,
        componentName: entry.componentName,
        sourceCode,
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

    // 4. Syntax + scope validation against the authorized file. Models often
    // emit under-specified hunk headers (a bare "@@"); repair those against the
    // source first. The repair is only trusted once the re-validated diff passes.
    const normalizedDiff = generated.diff
      ? normalizeUnifiedDiff(generated.diff, sourceCode)
      : generated.diff;
    const validation = normalizedDiff
      ? validatePatchDiff(normalizedDiff, entry.filePath, sourceCode)
      : {
          valid: false,
          changedFiles: [],
          errors: generated.errors?.length
            ? generated.errors
            : ['provider returned an empty diff'],
          warnings: [] as string[],
          addedLines: 0,
          removedLines: 0,
        };

    // 5. Isolated application: temp copy only, never the repository.
    let isolatedPreviewApplied = false;
    let finalDiff = generated.diff;
    if (validation.valid) {
      const { parsed } = parseUnifiedDiff(normalizedDiff, sourceCode);
      if (parsed) {
        finalDiff = serializeParsedDiff(parsed);
        const patched = applyParsedDiff(sourceCode, parsed);
        const previewDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchwork-preview-'));
        const previewFile = path.join(previewDir, path.basename(entry.filePath));
        fs.writeFileSync(path.join(previewDir, 'original.txt'), sourceCode, 'utf8');
        fs.writeFileSync(previewFile, patched, 'utf8');
        logger.info(
          { componentId: entry.id, previewDir, added: validation.addedLines },
          'Isolated preview written to temp copy; repository untouched',
        );
        isolatedPreviewApplied = true;
      }
    }

    // 6. Prove the repository file is unchanged.
    const afterSource = await repository.readFile(entry.filePath);
    const targetUnchanged = sha256(afterSource) === beforeHash;

    return {
      componentId: entry.id,
      componentName: entry.componentName,
      filePath: entry.filePath,
      instruction,
      provider: generated.provider,
      simulated: generated.simulated,
      diff: finalDiff,
      changedFiles: validation.valid ? validation.changedFiles : [],
      summary: generated.summary,
      validation,
      isolatedPreviewApplied,
      targetUnchanged,
      providerWarnings: generated.warnings,
    };
  }
}

export const editOrchestrationService = new EditOrchestrationService();
