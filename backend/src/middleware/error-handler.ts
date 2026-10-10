import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError';
import { logger } from '../config/logger';

// Consistent JSON error response
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;

  // Zod validation
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
        requestId,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId, code: err.code }, err.message);
    } else {
      logger.warn({ err, requestId, code: err.code }, err.message);
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  // CORS or other generic errors with status
  if (err instanceof Error && (err as unknown as { status?: number }).status) {
    const status = (err as unknown as { status: number }).status;
    const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST';
    logger.warn({ err, requestId }, err.message);
    res.status(status).json({
      success: false,
      error: {
        code,
        message: err.message,
        requestId,
      },
    });
    return;
  }

  // Unexpected
  logger.error({ err, requestId }, 'Unhandled error');

  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Internal server error' : (err as Error)?.message ?? 'Internal server error',
      requestId,
    },
  });
}
