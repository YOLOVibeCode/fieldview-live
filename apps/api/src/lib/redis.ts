/**
 * Redis Client
 * 
 * Redis connection for rate limiting, sessions, and job queues.
 */

import Redis from 'ioredis';

export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});
