/**
 * Idempotency Middleware
 * 
 * Ensures idempotent operations using idempotency keys.
 */

import type { Request, Response, NextFunction } from 'express';

import { checkIdempotencyKey, storeIdempotencyKey } from '../lib/idempotency';

export interface IdempotentRequest extends Request {
  idempotencyKey?: string;
}

/**
 * Idempotency Middleware
 * 
 * Checks for idempotency key in header.
 * If key exists and response cached, returns cached response.
 * Otherwise, continues and stores response on completion.
 */
export function requireIdempotencyKey(
  req: IdempotentRequest,
  res: Response,
  next: NextFunction
): void {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    return next();
  }

  req.idempotencyKey = idempotencyKey;

  // Check if we've seen this key before
  checkIdempotencyKey(idempotencyKey)
    .then(({ exists, response }) => {
      if (exists && response) {
        // Return cached response
        res.status(200).json(JSON.parse(response));
        return;
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json to cache response
      res.json = function (body: unknown) {
        if (req.idempotencyKey) {
          storeIdempotencyKey(req.idempotencyKey, JSON.stringify(body)).catch((error) => {
            console.error('Failed to store idempotency key:', error);
          });
        }
        return originalJson(body);
      };

      next();
    })
    .catch((error) => {
      console.error('Idempotency check failed:', error);
      next(); // Continue on error
    });
}
