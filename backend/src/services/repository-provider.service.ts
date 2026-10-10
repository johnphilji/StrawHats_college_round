import fs from 'fs';
import path from 'path';
import type { RepositoryProvider } from '../types/component.types';
import {
  InvalidRepositoryConfigError,
  PathTraversalError,
  SourceFileNotFoundError,
  UnsupportedSourceFileError,
} from '../errors/component.errors';
import { getRepositoryConfig, validateRepositoryConfig } from '../config/repository.config';

/**
 * Whitelist of allowed source file extensions for PATCHWORK component editing.
 */
const ALLOWED_EXTENSIONS = new Set([
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.json',
  '.html',
  '.svg',
]);

/**
 * Local filesystem implementation of RepositoryProvider.
 * Accesses local checkouts of the target repository with strict security safeguards.
 */
export class LocalRepositoryProvider implements RepositoryProvider {
  private readonly repositoryRoot: string;

  constructor(repositoryRoot: string) {
    if (!repositoryRoot || typeof repositoryRoot !== 'string' || !repositoryRoot.trim()) {
      throw new InvalidRepositoryConfigError('Repository root path is required and cannot be empty.');
    }
    this.repositoryRoot = path.resolve(repositoryRoot.trim());
  }

  public getRepositoryRoot(): string {
    return this.repositoryRoot;
  }

  /**
   * Validates and resolves a relative file path against the repository root.
   * Enforces strict boundaries to prevent path traversal attacks.
   */
  private resolveSafePath(relativeFilePath: string): string {
    if (!relativeFilePath || typeof relativeFilePath !== 'string' || !relativeFilePath.trim()) {
      throw new PathTraversalError('File path cannot be empty.');
    }

    const trimmed = relativeFilePath.trim();
    const normalizedSlash = trimmed.replace(/\\/g, '/');

    // Reject absolute paths, root-relative slashes, drive letters
    if (
      path.isAbsolute(trimmed) ||
      normalizedSlash.startsWith('/') ||
      /^[a-zA-Z]:/.test(trimmed)
    ) {
      throw new PathTraversalError('File path must be a relative path within the repository.');
    }

    // Check for traversal segments (..)
    const segments = normalizedSlash.split('/');
    if (segments.includes('..')) {
      throw new PathTraversalError('File path contains illegal directory traversal sequences (..).');
    }

    // Check extension whitelist
    const ext = path.extname(trimmed).toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      throw new UnsupportedSourceFileError(ext || 'no-extension');
    }

    // Resolve absolute path and verify boundary
    const resolvedPath = path.resolve(this.repositoryRoot, trimmed);
    const normalizedRoot = path.resolve(this.repositoryRoot);

    const rel = path.relative(normalizedRoot, resolvedPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new PathTraversalError('Resolved path escapes repository root boundary.');
    }

    return resolvedPath;
  }

  /**
   * Asserts that the configured repository root exists and is a directory.
   */
  private assertRepositoryRootExists(): void {
    if (!fs.existsSync(this.repositoryRoot)) {
      throw new InvalidRepositoryConfigError(
        'Configured repository root does not exist on the local filesystem.'
      );
    }

    const stat = fs.statSync(this.repositoryRoot);
    if (!stat.isDirectory()) {
      throw new InvalidRepositoryConfigError(
        'Configured repository root is not a directory.'
      );
    }
  }

  /**
   * Reads a registered source file as UTF-8 text without executing it.
   */
  public async readFile(relativeFilePath: string): Promise<string> {
    this.assertRepositoryRootExists();
    const safePath = this.resolveSafePath(relativeFilePath);

    // Verify root symlink boundary if accessible
    try {
      const realRoot = await fs.promises.realpath(this.repositoryRoot);
      if (fs.existsSync(safePath)) {
        const realFilePath = await fs.promises.realpath(safePath);
        const rel = path.relative(realRoot, realFilePath);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          throw new PathTraversalError('Symlink target escapes repository root.');
        }
      }
    } catch (err) {
      if (err instanceof PathTraversalError) throw err;
      // Realpath failures on non-existent files are handled below by file existence check
    }

    try {
      return await fs.promises.readFile(safePath, 'utf8');
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new SourceFileNotFoundError(relativeFilePath);
      }
      if (code === 'EISDIR') {
        throw new PathTraversalError('Target path is a directory, not a source file.');
      }
      throw err;
    }
  }

  /**
   * Checks if a relative file exists within the repository root.
   */
  public async fileExists(relativeFilePath: string): Promise<boolean> {
    this.assertRepositoryRootExists();
    const safePath = this.resolveSafePath(relativeFilePath);

    try {
      const stat = await fs.promises.stat(safePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }
}

/**
 * Creates a LocalRepositoryProvider using the active environment configuration.
 */
export function createDefaultRepositoryProvider(): LocalRepositoryProvider {
  const config = getRepositoryConfig();
  validateRepositoryConfig(config);
  return new LocalRepositoryProvider(config.repositoryRoot);
}

/**
 * Minimal content-reader surface used by {@link GithubRepositoryProvider}.
 * Supplied by callers that already hold an authorized way to fetch file
 * content (e.g. a verified GitHub App installation token flow). The provider
 * itself never sees credentials or tokens.
 */
export type GithubContentReader = {
  readContent(relativeFilePath: string): Promise<string>;
  contentExists(relativeFilePath: string): Promise<boolean>;
};

/**
 * GitHub-backed implementation of RepositoryProvider.
 * Reads file content through an injected authorized reader (typically bound
 * to one verified installation + repository + ref). Path/value validation
 * still happens at the reader (GitHub contents API surface), and callers
 * must only pass registry-derived paths, exactly as with the local provider.
 * `getRepositoryRoot()` returns a synthetic `github:owner/name@ref` label
 * (no caller uses it as a filesystem path).
 */
export class GithubRepositoryProvider implements RepositoryProvider {
  private readonly label: string;
  private readonly reader: GithubContentReader;

  constructor(label: string, reader: GithubContentReader) {
    if (!label || !label.trim()) {
      throw new InvalidRepositoryConfigError('GitHub repository label is required.');
    }
    this.label = label.trim();
    this.reader = reader;
  }

  public getRepositoryRoot(): string {
    return this.label;
  }

  public async readFile(relativeFilePath: string): Promise<string> {
    return this.reader.readContent(relativeFilePath);
  }

  public async fileExists(relativeFilePath: string): Promise<boolean> {
    return this.reader.contentExists(relativeFilePath);
  }
}
