/**
 * Rate Limiting Middleware
 * 
 * Rate limiting using express-rate-limit.
 * TODO: Switch to Redis store when Redis is available in production.
 */

import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions) {
  return rateLimit({
    // Using memory store for now; switch to RedisStore when Redis is available
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests, please try again later.',
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'unknown'),
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * SMS Rate Limit: 10 requests per phone number per minute
 */
export const smsRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => {
    // Use phone number from request body for SMS endpoints
    const phone = (req.body as { From?: string })?.From || req.ip || 'unknown';
    return `sms:${phone}`;
  },
});

/**
 * Checkout Rate Limit: 5 attempts per IP per 15 minutes
 */
export const checkoutRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many checkout attempts, please try again later.',
});

/**
 * Watch Page Rate Limit: 100 requests per token per hour
 */
export const watchRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  keyGenerator: (req) => {
    const token = req.params.token || 'unknown';
    return `watch:${token}`;
  },
});

/**
 * Admin Rate Limit: 50 actions per admin per minute
 */
export const adminRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  keyGenerator: (req) => {
    // TODO: Use admin user ID when auth is implemented
    return `admin:${req.ip || 'unknown'}`;
  },
});
