import { describe, it, expect } from 'vitest';
import { createProjectSchema } from '../../src/modules/projects/projects.schema';

describe('projects.schema', () => {
  it('should validate correct project input', () => {
    const result = createProjectSchema.safeParse({
      body: { name: 'My Project', productionBranch: 'main' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = createProjectSchema.safeParse({
      body: { name: '', productionBranch: 'main' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('should apply defaults', () => {
    const result = createProjectSchema.safeParse({
      body: { name: 'test' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.productionBranch).toBe('main');
    }
  });

  it('should reject invalid URL', () => {
    const result = createProjectSchema.safeParse({
      body: { name: 'test', repositoryUrl: 'not-a-url' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
