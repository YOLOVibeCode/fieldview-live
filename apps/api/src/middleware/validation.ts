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
      if (error instanceof z.ZodError) {
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
