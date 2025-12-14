/**
 * Error Handling
 * 
 * Custom error classes and error response formatting.
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super('NOT_FOUND', message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Invalid request', details?: unknown) {
    super('BAD_REQUEST', message, 400, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super('UNAUTHORIZED', message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: unknown) {
    super('FORBIDDEN', message, 403, details);
    this.name = 'ForbiddenError';
  }
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function formatErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  // Unknown error
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
}
