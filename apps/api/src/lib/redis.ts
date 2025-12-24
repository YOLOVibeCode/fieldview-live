/**
 * Redis Client
 * 
 * Redis connection for rate limiting, sessions, and job queues.
 */

import Redis from 'ioredis';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === '1';

export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:4303', {
  maxRetriesPerRequest: null,
  // Avoid noisy connection attempts during unit tests; tests that need Redis should provide REDIS_URL.
  lazyConnect: isTest,
  enableOfflineQueue: !isTest,
});

redisClient.on('error', (error) => {
  if (!isTest) {
    console.error('Redis connection error:', error);
  }
});

redisClient.on('connect', () => {
  if (!isTest) {
    console.log('Redis connected');
  }
});
