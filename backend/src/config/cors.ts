import cors, { CorsOptions } from 'cors';
import { getEnv, getAllowedOrigins } from './env';

export function getCorsOptions(): CorsOptions {
  const env = getEnv();
  const allowedOrigins = getAllowedOrigins(env);

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  };
}

export function corsMiddleware() {
  return cors(getCorsOptions());
}
