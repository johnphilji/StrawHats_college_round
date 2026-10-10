import type {
  RepositoryProvider,
  ResolvedComponentContext,
} from '../types/component.types';
import {
  ComponentResolverService,
  componentResolverService,
} from './component-resolver.service';
import {
  createDefaultRepositoryProvider,
} from './repository-provider.service';

/**
 * Service responsible for retrieving source code and context for a registered component.
 *
 * Enforces the core invariant:
 * - The source file path originates EXCLUSIVELY from the trusted registry.
 * - Resolves the component through ComponentResolverService first.
 * - Reads source text safely without execution or shell commands.
 */
export class SourceService {
  private readonly resolver: ComponentResolverService;
  private readonly repositoryProvider?: RepositoryProvider;
  private readonly providerFactory: () => RepositoryProvider;

  constructor(options?: {
    resolver?: ComponentResolverService;
    repositoryProvider?: RepositoryProvider;
    providerFactory?: () => RepositoryProvider;
  }) {
    this.resolver = options?.resolver ?? componentResolverService;
    this.repositoryProvider = options?.repositoryProvider;
    this.providerFactory =
      options?.providerFactory ?? (() => createDefaultRepositoryProvider());
  }

  /**
   * Resolves a component by its ID and fetches its current source code
   * from the configured repository.
   *
   * @param componentId Client-supplied component ID
   * @returns ResolvedComponentContext ready for consumption by LLM code-generation service
   */
  public async resolveComponentSource(
    componentId: string
  ): Promise<ResolvedComponentContext> {
    // 1. Resolve and validate through trusted registry (rejects unknown/non-editable)
    const entry = this.resolver.resolveComponent(componentId);

    // 2. Obtain repository provider
    const provider = this.repositoryProvider ?? this.providerFactory();

    // 3. Read source code from the authorized registry relative path
    const sourceCode = await provider.readFile(entry.filePath);

    // 4. Return complete context for the downstream LLM service
    return {
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
    };
  }
}

/**
 * Default singleton instance of SourceService.
 */
export const sourceService = new SourceService();

/**
 * Functional convenience helper for resolving component source context.
 */
export async function resolveComponentSource(
  componentId: string,
  options?: {
    resolver?: ComponentResolverService;
    repositoryProvider?: RepositoryProvider;
  }
): Promise<ResolvedComponentContext> {
  const service = options ? new SourceService(options) : sourceService;
  return service.resolveComponentSource(componentId);
}
