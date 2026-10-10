import pino from 'pino';
import { getEnv } from './env';

function createLogger() {
  // Use env if available, otherwise fallback to info level
  let level = 'info';
  try {
    level = getEnv().LOG_LEVEL;
  } catch {
    // env not validated yet – use default
  }

  const isDev = process.env.NODE_ENV !== 'production';

  return pino({
    level,
    // In development, use pino-pretty if available; otherwise JSON
    transport: isDev
      ? undefined
      : undefined,
    // Never log sensitive fields at top-level
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.x-patchwork-signature',
        '*.password',
        '*.secret',
        '*.token',
        'DATABASE_URL',
        'DIRECT_URL',
        'SUPABASE_SECRET_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'INTERNAL_WORKER_SECRET',
      ],
      censor: '[REDACTED]',
    },
    base: {
      service: 'patchwork-backend',
    },
  });
}

export const logger = createLogger();
