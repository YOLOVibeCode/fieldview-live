/**
 * Error Handling Middleware
 * 
 * Catches all errors and formats consistent error responses.
 */

import type { Request, Response, NextFunction } from 'express';

import { AppError, formatErrorResponse } from '../lib/errors';
import { logger } from '../lib/logger';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const errorResponse = formatErrorResponse(error);
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  // Log error
  if (statusCode >= 500) {
    logger.error({ error }, 'Internal server error');
  } else {
    logger.warn({ error }, 'Client error');
  }

  res.status(statusCode).json(errorResponse);
}
