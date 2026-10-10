import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env before validation if present (no error if missing)
dotenv.config();

// Helper: empty string should be treated as undefined (dotenv loads "" for blank vars)
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);
const optionalUrlSchema = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalStringSchema = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  FRONTEND_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: optionalStringSchema,
  DIRECT_URL: optionalStringSchema,
  SUPABASE_URL: optionalUrlSchema,
  SUPABASE_PUBLISHABLE_KEY: optionalStringSchema,
  // Legacy names – support both old and new Supabase key conventions
  SUPABASE_ANON_KEY: optionalStringSchema,
  SUPABASE_SECRET_KEY: optionalStringSchema,
  SUPABASE_SERVICE_ROLE_KEY: optionalStringSchema,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  // Normalize Supabase keys: allow either new or legacy names
  const data = parsed.data;
  // If only legacy anon provided, map to publishable
  if (!data.SUPABASE_PUBLISHABLE_KEY && data.SUPABASE_ANON_KEY) {
    data.SUPABASE_PUBLISHABLE_KEY = data.SUPABASE_ANON_KEY;
  }
  if (!data.SUPABASE_SECRET_KEY && data.SUPABASE_SERVICE_ROLE_KEY) {
    data.SUPABASE_SECRET_KEY = data.SUPABASE_SERVICE_ROLE_KEY;
  }

  cachedEnv = data as Env;
  return cachedEnv;
}

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  return validateEnv();
}

// For testing: reset cache
export function resetEnvCache(): void {
  cachedEnv = null;
}

export function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
