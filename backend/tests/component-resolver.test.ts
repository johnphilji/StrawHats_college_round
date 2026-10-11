import { describe, it, expect } from 'vitest';
import {
  ComponentResolverService,
  resolveComponent,
} from '../src/services/component-resolver.service';
import {
  validateRegistrySchema,
} from '../src/config/component-registry';
import {
  ComponentNotFoundError,
  ComponentNotEditableError,
  InvalidComponentIdError,
  RegistryValidationError,
} from '../src/errors/component.errors';
import type { ComponentRegistry } from '../src/types/component.types';

describe('Component Resolver Service', () => {
  // Test fixture custom registry
  const mockRegistry: ComponentRegistry = {
    'navbar-logo': {
      id: 'navbar-logo',
      filePath: 'src/components/Navbar.tsx',
      componentName: 'NavbarLogo',
      editable: true,
      editableScope: 'content',
      allowedOperations: ['text', 'styling'],
      description: 'Site header logo text and link',
      framework: 'react',
    },
    'hero-banner': {
      id: 'hero-banner',
      filePath: 'src/components/Hero.tsx',
      componentName: 'HeroBanner',
      editable: true,
      editableScope: 'styles',
      allowedOperations: ['styling', 'layout'],
      description: 'Main promotional banner',
      framework: 'react',
    },
    'copyright-footer': {
      id: 'copyright-footer',
      filePath: 'src/components/Footer.tsx',
      componentName: 'Footer',
      editable: false, // Locked
      description: 'Footer copyright statement',
      framework: 'react',
    },
  };

  const resolver = new ComponentResolverService(mockRegistry);

  // Case 1: A registered editable component resolves successfully
  it('resolves a registered editable component successfully', () => {
    const component = resolver.resolveComponent('navbar-logo');
    expect(component).toBeDefined();
    expect(component.id).toBe('navbar-logo');
    expect(component.filePath).toBe('src/components/Navbar.tsx');
    expect(component.componentName).toBe('NavbarLogo');
    expect(component.editable).toBe(true);
    expect(component.editableScope).toBe('content');
    expect(component.allowedOperations).toEqual(['text', 'styling']);
    expect(component.framework).toBe('react');
  });

  // Case 2: An unknown component ID is rejected
  it('rejects an unknown component ID with ComponentNotFoundError', () => {
    expect(() => resolver.resolveComponent('non-existent-component')).toThrow(
      ComponentNotFoundError
    );
    try {
      resolver.resolveComponent('non-existent-component');
    } catch (err) {
      expect(err).toBeInstanceOf(ComponentNotFoundError);
      expect((err as ComponentNotFoundError).statusCode).toBe(404);
      expect((err as ComponentNotFoundError).code).toBe('NOT_FOUND');
    }
  });

  // Case 3: A registered but non-editable component is rejected
  it('rejects a registered but non-editable component with ComponentNotEditableError', () => {
    expect(() => resolver.resolveComponent('copyright-footer')).toThrow(
      ComponentNotEditableError
    );
    try {
      resolver.resolveComponent('copyright-footer');
    } catch (err) {
      expect(err).toBeInstanceOf(ComponentNotEditableError);
      expect((err as ComponentNotEditableError).statusCode).toBe(403);
      expect((err as ComponentNotEditableError).code).toBe('FORBIDDEN');
    }
  });

  // Empty, malformed, or whitespace component IDs are rejected
  it('rejects empty or whitespace-only component IDs with InvalidComponentIdError', () => {
    expect(() => resolver.resolveComponent('')).toThrow(InvalidComponentIdError);
    expect(() => resolver.resolveComponent('   ')).toThrow(InvalidComponentIdError);
    expect(() => resolver.resolveComponent(null as unknown as string)).toThrow(
      InvalidComponentIdError
    );
  });

  // Case 8: The resolver does not accept a file path supplied by the client
  it('ignores any client-supplied file path and derives path strictly from trusted registry', () => {
    // resolveComponent accepts only componentId
    const resolved = resolver.resolveComponent('hero-banner');
    expect(resolved.filePath).toBe('src/components/Hero.tsx');

    // Even if caller attempts to pass arbitrary extra args or property spoofing
    const resolvedAgain = (resolver.resolveComponent as unknown as (id: string, path: string) => unknown)(
      'hero-banner',
      '../../etc/passwd'
    ) as { filePath: string };
    expect(resolvedAgain.filePath).toBe('src/components/Hero.tsx');
  });

  // Case 10: A change to registry configuration works without changing resolver implementation
  it('adapts to registry configuration updates without requiring resolver changes', () => {
    const updatedRegistry: ComponentRegistry = {
      'custom-pricing-card': {
        id: 'custom-pricing-card',
        filePath: 'src/modules/pricing/PricingCard.tsx',
        componentName: 'PricingCard',
        editable: true,
        editableScope: 'component',
        allowedOperations: ['structure', 'content', 'styling'],
        description: 'New pricing card from redesigned demo app',
        framework: 'next',
      },
    };

    // Instantiate resolver with the new registry config
    const updatedResolver = new ComponentResolverService(updatedRegistry);
    const resolved = updatedResolver.resolveComponent('custom-pricing-card');

    expect(resolved.id).toBe('custom-pricing-card');
    expect(resolved.filePath).toBe('src/modules/pricing/PricingCard.tsx');
    expect(resolved.componentName).toBe('PricingCard');
    expect(resolved.framework).toBe('next');
  });

  // Safe metadata helper strips server-side file path
  it('returns safe metadata without exposing internal file paths', () => {
    const metadata = resolver.getComponentMetadata('navbar-logo');
    expect(metadata.id).toBe('navbar-logo');
    expect(metadata.componentName).toBe('NavbarLogo');
    expect(metadata.editable).toBe(true);
    expect(metadata.editableScope).toBe('content');
    expect(metadata.allowedOperations).toEqual(['text', 'styling']);
    expect((metadata as unknown as Record<string, unknown>).filePath).toBeUndefined();
  });

  // Functional helper resolveComponent
  it('supports functional resolveComponent helper with custom registry', () => {
    const entry = resolveComponent('navbar-logo', mockRegistry);
    expect(entry.id).toBe('navbar-logo');
  });
});

describe('Registry Schema Validation', () => {
  // Case 7: Registry key and entry ID mismatches are detected
  it('detects registry key and entry ID mismatches', () => {
    const invalidRegistry: ComponentRegistry = {
      'mismatched-key': {
        id: 'different-id',
        filePath: 'src/Button.tsx',
        componentName: 'Button',
        editable: true,
      },
    };

    expect(() => validateRegistrySchema(invalidRegistry)).toThrow(RegistryValidationError);
    try {
      validateRegistrySchema(invalidRegistry);
    } catch (err) {
      expect(err).toBeInstanceOf(RegistryValidationError);
      expect((err as RegistryValidationError).message).toContain('mismatched-key');
    }
  });

  it('rejects entries with absolute file paths', () => {
    const invalidRegistry: ComponentRegistry = {
      'sample-btn': {
        id: 'sample-btn',
        filePath: '/usr/local/src/Button.tsx',
        componentName: 'Button',
        editable: true,
      },
    };

    expect(() => validateRegistrySchema(invalidRegistry)).toThrow(RegistryValidationError);
  });

  it('rejects entries with path traversal sequences (..)', () => {
    const invalidRegistry: ComponentRegistry = {
      'sample-btn': {
        id: 'sample-btn',
        filePath: '../secret/Button.tsx',
        componentName: 'Button',
        editable: true,
      },
    };

    expect(() => validateRegistrySchema(invalidRegistry)).toThrow(RegistryValidationError);
  });

  it('rejects entries with invalid editableScope', () => {
    const invalidRegistry = {
      'sample-btn': {
        id: 'sample-btn',
        filePath: 'src/Button.tsx',
        componentName: 'Button',
        editable: true,
        editableScope: 'arbitrary-scope',
      },
    } as unknown as ComponentRegistry;

    expect(() => validateRegistrySchema(invalidRegistry)).toThrow(RegistryValidationError);
  });

  it('passes valid registry schema', () => {
    const validRegistry: ComponentRegistry = {
      'sample-btn': {
        id: 'sample-btn',
        filePath: 'src/components/Button.tsx',
        componentName: 'Button',
        editable: true,
        editableScope: 'styles',
        allowedOperations: ['styling'],
        framework: 'react',
      },
    };

    expect(() => validateRegistrySchema(validRegistry)).not.toThrow();
  });
});
