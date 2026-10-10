import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  LocalRepositoryProvider,
} from '../src/services/repository-provider.service';
import {
  ComponentResolverService,
} from '../src/services/component-resolver.service';
import {
  SourceService,
  resolveComponentSource,
} from '../src/services/source.service';
import {
  SourceFileNotFoundError,
  InvalidRepositoryConfigError,
  PathTraversalError,
  UnsupportedSourceFileError,
  ComponentNotFoundError,
  ComponentNotEditableError,
} from '../src/errors/component.errors';
import type { ComponentRegistry } from '../src/types/component.types';

describe('SourceService & Repository Provider', () => {
  let tempRepoDir: string;
  let provider: LocalRepositoryProvider;
  let resolver: ComponentResolverService;
  let sourceService: SourceService;

  const sampleRegistry: ComponentRegistry = {
    'sample-hero-title': {
      id: 'sample-hero-title',
      filePath: 'src/components/Hero.tsx',
      componentName: 'Hero',
      editable: true,
      editableScope: 'content',
      allowedOperations: ['text', 'styling'],
      description: 'Main hero section heading',
      framework: 'react',
    },
    'sample-missing-file': {
      id: 'sample-missing-file',
      filePath: 'src/components/NonExistent.tsx',
      componentName: 'NonExistent',
      editable: true,
    },
    'sample-unsupported-ext': {
      id: 'sample-unsupported-ext',
      filePath: 'config/secrets.env',
      componentName: 'Secrets',
      editable: true,
    },
    'sample-locked': {
      id: 'sample-locked',
      filePath: 'src/components/Footer.tsx',
      componentName: 'Footer',
      editable: false,
    },
  };

  const sampleHeroContent = `import React from 'react';\n\nexport const Hero: React.FC = () => {\n  return <h1>Hero Title</h1>;\n};\n`;

  beforeAll(() => {
    // Create a temporary demo repo directory
    tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchwork-test-repo-'));
    const componentsDir = path.join(tempRepoDir, 'src', 'components');
    fs.mkdirSync(componentsDir, { recursive: true });

    // Write Hero.tsx
    fs.writeFileSync(path.join(componentsDir, 'Hero.tsx'), sampleHeroContent, 'utf8');

    // Create services with test dependencies
    provider = new LocalRepositoryProvider(tempRepoDir);
    resolver = new ComponentResolverService(sampleRegistry);
    sourceService = new SourceService({
      resolver,
      repositoryProvider: provider,
    });
  });

  afterAll(() => {
    // Clean up temporary test repository
    try {
      fs.rmSync(tempRepoDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  // Case 9: The resolved context includes the correct source code and editing restrictions
  it('resolves component source context including correct source code and metadata', async () => {
    const context = await sourceService.resolveComponentSource('sample-hero-title');

    expect(context).toBeDefined();
    expect(context.componentId).toBe('sample-hero-title');
    expect(context.componentName).toBe('Hero');
    expect(context.filePath).toBe('src/components/Hero.tsx');
    expect(context.sourceCode).toBe(sampleHeroContent);
    expect(context.editableScope).toBe('content');
    expect(context.allowedOperations).toEqual(['text', 'styling']);
    expect(context.description).toBe('Main hero section heading');
    expect(context.framework).toBe('react');
  });

  // Case 4: A missing source file produces a controlled error
  it('throws SourceFileNotFoundError when registered source file is missing', async () => {
    await expect(
      sourceService.resolveComponentSource('sample-missing-file')
    ).rejects.toThrow(SourceFileNotFoundError);

    try {
      await sourceService.resolveComponentSource('sample-missing-file');
    } catch (err) {
      expect(err).toBeInstanceOf(SourceFileNotFoundError);
      expect((err as SourceFileNotFoundError).statusCode).toBe(404);
      expect((err as SourceFileNotFoundError).code).toBe('NOT_FOUND');
    }
  });

  // Case 5: An invalid repository configuration produces a controlled error
  it('throws InvalidRepositoryConfigError when repository configuration is missing or invalid', async () => {
    expect(() => new LocalRepositoryProvider('')).toThrow(InvalidRepositoryConfigError);
    expect(() => new LocalRepositoryProvider('   ')).toThrow(InvalidRepositoryConfigError);

    // Repository directory does not exist on filesystem
    const nonExistentPath = path.join(os.tmpdir(), 'non-existent-repo-' + Date.now());
    const badProvider = new LocalRepositoryProvider(nonExistentPath);

    await expect(badProvider.readFile('src/components/Hero.tsx')).rejects.toThrow(
      InvalidRepositoryConfigError
    );
  });

  // Case 6: A path-traversal attempt is rejected
  it('rejects path-traversal attempts with PathTraversalError', async () => {
    const traversalAttempts = [
      '../secret.txt',
      '..\\secret.txt',
      'src/../../escape.txt',
      '/etc/passwd',
      'C:\\Windows\\System32\\cmd.exe',
      'src/components/../../../package.json',
    ];

    for (const badPath of traversalAttempts) {
      await expect(provider.readFile(badPath)).rejects.toThrow(PathTraversalError);
      await expect(provider.fileExists(badPath)).rejects.toThrow(PathTraversalError);
    }
  });

  // Unsupported file extensions are rejected
  it('rejects files with unsupported extensions with UnsupportedSourceFileError', async () => {
    await expect(
      sourceService.resolveComponentSource('sample-unsupported-ext')
    ).rejects.toThrow(UnsupportedSourceFileError);
  });

  // SourceService calls resolver internally: unknown component
  it('rejects unknown component IDs before reading files', async () => {
    await expect(
      sourceService.resolveComponentSource('completely-unknown-id')
    ).rejects.toThrow(ComponentNotFoundError);
  });

  // SourceService calls resolver internally: locked component
  it('rejects non-editable component IDs before reading files', async () => {
    await expect(
      sourceService.resolveComponentSource('sample-locked')
    ).rejects.toThrow(ComponentNotEditableError);
  });

  // Verification that read operations do NOT modify source files
  it('reads file content without modifying it', async () => {
    const beforeStats = fs.statSync(path.join(tempRepoDir, 'src', 'components', 'Hero.tsx'));
    await sourceService.resolveComponentSource('sample-hero-title');
    const afterStats = fs.statSync(path.join(tempRepoDir, 'src', 'components', 'Hero.tsx'));

    expect(afterStats.size).toBe(beforeStats.size);
    const content = fs.readFileSync(
      path.join(tempRepoDir, 'src', 'components', 'Hero.tsx'),
      'utf8'
    );
    expect(content).toBe(sampleHeroContent);
  });

  // Functional helper resolveComponentSource
  it('works with functional resolveComponentSource helper', async () => {
    const result = await resolveComponentSource('sample-hero-title', {
      resolver,
      repositoryProvider: provider,
    });
    expect(result.sourceCode).toBe(sampleHeroContent);
  });
});
