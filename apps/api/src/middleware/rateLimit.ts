/**
 * Rate Limiting Middleware
 * 
 * Configures rate limits for different API endpoints.
 */

import type { Request } from 'express';
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

import { redisClient } from '../lib/redis';

/**
 * Create a rate limiter with specified options.
 * Uses Redis store in production, in-memory fallback for development.
 */
function createRateLimiter(options: Partial<Options>): ReturnType<typeof rateLimit> {
  const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production';
  
  const rateLimitOptions: Partial<Options> = {
    ...options,
  };
  
  if (useRedis) {
    // RedisStore for production - works across multiple instances
    // rate-limit-redis requires sendCommand function for ioredis
    rateLimitOptions.store = new RedisStore({
      // @ts-expect-error - rate-limit-redis types don't match ioredis call signature exactly
      sendCommand: (...args: string[]) => {
        return redisClient.call(...(args as [string, ...string[]])) as Promise<string | number | Buffer | null>;
      },
      prefix: 'rl:',
    });
  }
  // If not using Redis, default in-memory store is used
  
  return rateLimit(rateLimitOptions);
}

/**
 * SMS Rate Limit: 10 requests per phone per minute
 * Uses phone number from request body (From field) for key generation
 */
export const smsRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many SMS requests, please try again later.',
  keyGenerator: (req: Request) => {
    // Use phone number from request body for SMS endpoints
    const phone = (req.body as { From?: string })?.From || 'unknown';
    return `sms:${phone}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Checkout Rate Limit: 5 requests per IP per minute
 */
export const checkoutRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many checkout requests, please try again later.',
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip || 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Watch Rate Limit: 20 requests per IP per minute
 */
export const watchRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many watch requests, please try again later.',
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip || 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin Rate Limit: 100 requests per IP per minute
 */
export const adminRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many admin requests, please try again later.',
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip || 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
});
