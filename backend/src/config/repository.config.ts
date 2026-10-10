import { getEnv } from './env';
import type { RepositoryConfig } from '../types/component.types';
import { InvalidRepositoryConfigError } from '../errors/component.errors';

/**
 * Loads the current repository configuration from environment variables.
 */
export function getRepositoryConfig(): RepositoryConfig {
  const env = getEnv();
  const repositoryRoot = (
    env.TARGET_REPOSITORY_PATH ??
    process.env.TARGET_REPOSITORY_PATH ??
    ''
  ).trim();

  return {
    repositoryRoot,
    repositoryUrl: process.env.TARGET_REPOSITORY_URL?.trim() || undefined,
    projectIdentifier: process.env.TARGET_PROJECT_IDENTIFIER?.trim() || undefined,
    branch: process.env.TARGET_REPOSITORY_BRANCH?.trim() || undefined,
    commitSha: process.env.TARGET_COMMIT_SHA?.trim() || undefined,
  };
}

/**
 * Validates the repository configuration.
 * Throws InvalidRepositoryConfigError if the repository root is missing or blank.
 */
export function validateRepositoryConfig(config: RepositoryConfig): void {
  if (!config.repositoryRoot || !config.repositoryRoot.trim()) {
    throw new InvalidRepositoryConfigError(
      'Target repository path is not configured. Set TARGET_REPOSITORY_PATH in .env or environment.'
    );
  }
}
