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
