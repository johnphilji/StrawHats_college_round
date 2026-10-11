import { AppError } from '../shared/errors/AppError';

export class ComponentNotFoundError extends AppError {
  constructor(componentId: string) {
    super(`Component with ID '${componentId}' was not found in the registry`, {
      statusCode: 404,
      code: 'NOT_FOUND',
      details: { componentId },
    });
    this.name = 'ComponentNotFoundError';
  }
}

export class ComponentNotEditableError extends AppError {
  constructor(componentId: string) {
    super(`Component with ID '${componentId}' is registered but marked as non-editable`, {
      statusCode: 403,
      code: 'FORBIDDEN',
      details: { componentId },
    });
    this.name = 'ComponentNotEditableError';
  }
}

export class InvalidComponentIdError extends AppError {
  constructor(message = 'Invalid component ID provided', details?: unknown) {
    super(message, {
      statusCode: 400,
      code: 'BAD_REQUEST',
      details,
    });
    this.name = 'InvalidComponentIdError';
  }
}

export class PathTraversalError extends AppError {
  constructor(message = 'Invalid file path: path traversal or unauthorized repository escape detected') {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN',
    });
    this.name = 'PathTraversalError';
  }
}

export class SourceFileNotFoundError extends AppError {
  constructor(filePath: string, componentId?: string) {
    super(`Source file not found for component${componentId ? ` '${componentId}'` : ''}`, {
      statusCode: 404,
      code: 'NOT_FOUND',
      details: { relativePath: filePath, componentId },
    });
    this.name = 'SourceFileNotFoundError';
  }
}

export class UnsupportedSourceFileError extends AppError {
  constructor(extension: string) {
    super(`Unsupported source file extension: '${extension}'`, {
      statusCode: 400,
      code: 'BAD_REQUEST',
      details: { extension },
    });
    this.name = 'UnsupportedSourceFileError';
  }
}

export class InvalidRepositoryConfigError extends AppError {
  constructor(message = 'Target repository configuration is missing or invalid') {
    super(message, {
      statusCode: 500,
      code: 'CONFIGURATION_ERROR',
    });
    this.name = 'InvalidRepositoryConfigError';
  }
}

export class RegistryValidationError extends AppError {
  constructor(message: string, issues?: string[]) {
    super(`Registry configuration error: ${message}`, {
      statusCode: 500,
      code: 'CONFIGURATION_ERROR',
      details: issues ? { issues } : undefined,
    });
    this.name = 'RegistryValidationError';
  }
}
