import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv, resetEnvCache } from '../../src/config/env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetEnvCache();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetEnvCache();
  });

  it('should validate with defaults when optional vars missing', () => {
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
    const env = validateEnv();
    expect(env.NODE_ENV).toBeDefined();
    expect(env.PORT).toBeDefined();
  });

  it('should fail on invalid PORT', () => {
    process.env.PORT = 'not-a-number';
    expect(() => validateEnv()).toThrow();
  });

  it('should parse ALLOWED_ORIGINS helper', async () => {
    process.env.ALLOWED_ORIGINS = 'http://a.com,http://b.com';
    const { getAllowedOrigins } = await import('../../src/config/env');
    const env = validateEnv();
    expect(getAllowedOrigins(env)).toEqual(['http://a.com', 'http://b.com']);
  });
});
