/**
 * Request Validation Middleware (Zod)
 * 
 * Validates request body/query/params against Zod schemas.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { BadRequestError } from '../lib/errors';

export interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

/**
 * True for a Zod validation failure, whichever loaded copy of zod raised it.
 *
 * A schema from another package (`@fieldview/data-model`) can come with its own copy of
 * zod: the test runner loads one copy as ESM and one as CommonJS. `instanceof` is false
 * across copies, so the name and the list of issues are checked as well.
 */
function isZodError(error: unknown): error is z.ZodError {
  if (error instanceof z.ZodError) {
    return true;
  }
  return (
    error instanceof Error &&
    error.name === 'ZodError' &&
    Array.isArray((error as { errors?: unknown }).errors)
  );
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (isZodError(error)) {
        next(
          new BadRequestError('Validation failed', {
            errors: error.errors,
          })
        );
      } else {
        next(error);
      }
    }
  };
}
