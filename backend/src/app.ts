import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { corsMiddleware } from './config/cors';
import { requestContext } from './middleware/request-context';
import { notFound } from './middleware/not-found';
import { errorHandler } from './middleware/error-handler';
import routes from './routes/index';

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // Request context (X-Request-Id)
  app.use(requestContext);

  // Logging – pino-http
  app.use(
    pinoHttp({
      logger,
      // Do not log authorization headers
      customProps: (req) => ({ requestId: (req as unknown as { requestId?: string }).requestId }),
      // Auto-log disabled for health? Keep but redact
    })
  );

  // CORS – must be before routes but after request context
  app.use(corsMiddleware());

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API routes – mounted at /api
  app.use('/api', routes);

  // Root convenience
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'PATCHWORK Backend',
        version: '0.1.0',
        docs: '/api/health',
      },
    });
  });

  // 404 handler for unmatched routes
  app.use(notFound);

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
