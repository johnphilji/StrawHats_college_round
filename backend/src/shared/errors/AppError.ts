export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    opts: {
      statusCode: number;
      code: ErrorCode;
      details?: unknown;
      isOperational?: boolean;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.details = opts.details;
    this.isOperational = opts.isOperational ?? true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(message, { statusCode: 400, code: 'BAD_REQUEST', details });
}

export function unauthorized(message = 'Unauthorized', details?: unknown): AppError {
  return new AppError(message, { statusCode: 401, code: 'UNAUTHORIZED', details });
}

export function forbidden(message = 'Forbidden', details?: unknown): AppError {
  return new AppError(message, { statusCode: 403, code: 'FORBIDDEN', details });
}

export function notFound(message = 'Not found', details?: unknown): AppError {
  return new AppError(message, { statusCode: 404, code: 'NOT_FOUND', details });
}

export function conflict(message: string, details?: unknown): AppError {
  return new AppError(message, { statusCode: 409, code: 'CONFLICT', details });
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError(message, { statusCode: 422, code: 'VALIDATION_ERROR', details });
}

export function internalError(message = 'Internal server error', details?: unknown): AppError {
  return new AppError(message, { statusCode: 500, code: 'INTERNAL_ERROR', details, isOperational: false });
}
