import path from 'path';
import type {
  ComponentRegistry,
  ComponentRegistryEntry,
  RepositoryProvider,
} from '../types/component.types';
import { RegistryValidationError } from '../errors/component.errors';

/**
 * Default sample registry configuration.
 *
 * NOTE: These entries are for testing and demonstration with the sample project.
 * When integrating with the real demo repository, replace these entries with the
 * actual component IDs (data-patchwork-id) and repository-relative file paths.
 */
export const componentRegistry: ComponentRegistry = {
  'sample-hero-title': {
    id: 'sample-hero-title',
    filePath: 'src/components/Hero.tsx',
    componentName: 'Hero',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Main hero section heading',
    framework: 'react',
  },
  'sample-primary-button': {
    id: 'sample-primary-button',
    filePath: 'src/components/PrimaryButton.tsx',
    componentName: 'PrimaryButton',
    editable: true,
    editableScope: 'styles',
    allowedOperations: ['styling', 'text'],
    description: 'Primary call-to-action button',
    framework: 'react',
  },
  'sample-readonly-footer': {
    id: 'sample-readonly-footer',
    filePath: 'src/components/Footer.tsx',
    componentName: 'Footer',
    editable: false,
    description: 'Global footer copyright notice (locked)',
    framework: 'react',
  },
};

const VALID_EDITABLE_SCOPES = new Set(['content', 'styles', 'component']);
const VALID_FRAMEWORKS = new Set(['react', 'next']);

/**
 * Validates the component registry schema and structural integrity.
 * This runs independently of the filesystem and verifies that keys match IDs,
 * paths are relative and free of traversal sequences, and required fields are valid.
 *
 * Throws a RegistryValidationError if any entry fails validation.
 */
export function validateRegistrySchema(registry: ComponentRegistry): void {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    throw new RegistryValidationError('Registry must be a key-value record of ComponentRegistryEntry');
  }

  const issues: string[] = [];
  const seenIds = new Set<string>();

  for (const [key, entry] of Object.entries(registry)) {
    if (!entry || typeof entry !== 'object') {
      issues.push(`Key '${key}': entry is not an object.`);
      continue;
    }

    // 1. Key must match entry.id
    if (key !== entry.id) {
      issues.push(`Key mismatch: registry key '${key}' does not match entry ID '${entry.id}'.`);
    }

    // 2. ID validation
    if (!entry.id || typeof entry.id !== 'string' || !entry.id.trim()) {
      issues.push(`Key '${key}': id must be a non-empty string.`);
    } else {
      if (seenIds.has(entry.id)) {
        issues.push(`Duplicate ID: '${entry.id}' is defined multiple times.`);
      }
      seenIds.add(entry.id);
    }

    // 3. Component name validation
    if (!entry.componentName || typeof entry.componentName !== 'string' || !entry.componentName.trim()) {
      issues.push(`Entry '${key}': componentName must be a non-empty string.`);
    }

    // 4. Editable flag validation
    if (typeof entry.editable !== 'boolean') {
      issues.push(`Entry '${key}': editable must be a boolean.`);
    }

    // 5. File path validation (must be relative, non-empty, no traversal tokens)
    if (!entry.filePath || typeof entry.filePath !== 'string' || !entry.filePath.trim()) {
      issues.push(`Entry '${key}': filePath must be a non-empty relative path.`);
    } else {
      const normalizedPath = entry.filePath.trim().replace(/\\/g, '/');

      // Reject absolute paths, root-relative paths, drive letters
      if (
        path.isAbsolute(entry.filePath) ||
        normalizedPath.startsWith('/') ||
        /^[a-zA-Z]:/.test(entry.filePath)
      ) {
        issues.push(`Entry '${key}': filePath '${entry.filePath}' must be relative, not absolute.`);
      }

      // Reject traversal tokens
      const pathSegments = normalizedPath.split('/');
      if (pathSegments.includes('..')) {
        issues.push(`Entry '${key}': filePath '${entry.filePath}' contains illegal traversal sequence ('..').`);
      }
    }

    // 6. Optional editableScope validation
    if (entry.editableScope !== undefined && !VALID_EDITABLE_SCOPES.has(entry.editableScope)) {
      issues.push(
        `Entry '${key}': invalid editableScope '${entry.editableScope}'. Allowed: 'content', 'styles', 'component'.`
      );
    }

    // 7. Optional allowedOperations validation
    if (entry.allowedOperations !== undefined) {
      if (!Array.isArray(entry.allowedOperations)) {
        issues.push(`Entry '${key}': allowedOperations must be an array of strings.`);
      } else {
        const hasInvalidOp = entry.allowedOperations.some(
          (op) => typeof op !== 'string' || !op.trim()
        );
        if (hasInvalidOp) {
          issues.push(`Entry '${key}': allowedOperations must contain only non-empty strings.`);
        }
      }
    }

    // 8. Optional framework validation
    if (entry.framework !== undefined && !VALID_FRAMEWORKS.has(entry.framework)) {
      issues.push(`Entry '${key}': invalid framework '${entry.framework}'. Allowed: 'react', 'next'.`);
    }
  }

  if (issues.length > 0) {
    throw new RegistryValidationError(
      `Found ${issues.length} registry validation error(s):\n - ${issues.join('\n - ')}`,
      issues
    );
  }
}

/**
 * Validates that all files registered in the component registry exist
 * within the repository via the provided RepositoryProvider.
 */
export async function validateRegistryFilesExist(
  registry: ComponentRegistry,
  provider: RepositoryProvider
): Promise<{ valid: boolean; missingFiles: string[] }> {
  const missingFiles: string[] = [];

  for (const entry of Object.values(registry)) {
    try {
      const exists = await provider.fileExists(entry.filePath);
      if (!exists) {
        missingFiles.push(entry.filePath);
      }
    } catch {
      missingFiles.push(entry.filePath);
    }
  }

  return {
    valid: missingFiles.length === 0,
    missingFiles,
  };
}
