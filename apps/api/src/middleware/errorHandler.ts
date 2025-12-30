/**
 * Error Handling Middleware
 * 
 * Catches all errors and formats consistent error responses.
 */

import * as Sentry from '@sentry/node';
import type { Request, Response, NextFunction } from 'express';

import { AppError, formatErrorResponse } from '../lib/errors';
import { logger } from '../lib/logger';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const errorResponse = formatErrorResponse(error);
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  // Log error
  if (statusCode >= 500) {
    logger.error({ error }, 'Internal server error');
    // Capture server errors in Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: { statusCode },
        extra: { path: req.path, method: req.method },
      });
    }
  } else {
    logger.warn({ error }, 'Client error');
  }

  res.status(statusCode).json(errorResponse);
}
