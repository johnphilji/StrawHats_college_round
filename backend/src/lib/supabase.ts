import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env';
import { logger } from '../config/logger';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  try {
    const env = getEnv();
    return Boolean(env.SUPABASE_URL && (env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY));
  } catch {
    return false;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;

  let env;
  try {
    env = getEnv();
  } catch {
    return null;
  }

  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    logger.warn('Supabase not configured – SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY missing');
    return null;
  }

  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

// For testing – reset singleton
export function resetSupabaseClient(): void {
  client = null;
}
