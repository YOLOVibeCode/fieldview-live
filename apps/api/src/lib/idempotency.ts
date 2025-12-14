/**
 * Idempotency Key Management
 * 
 * Ensures idempotent operations (e.g., webhooks, payments).
 */

import { redisClient } from './redis';

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

export async function checkIdempotencyKey(key: string): Promise<{ exists: boolean; response?: string }> {
  const cached = await redisClient.get(`idempotency:${key}`);
  
  if (cached) {
    return { exists: true, response: cached };
  }
  
  return { exists: false };
}

export async function storeIdempotencyKey(key: string, response: string): Promise<void> {
  await redisClient.setex(`idempotency:${key}`, IDEMPOTENCY_TTL, response);
}
