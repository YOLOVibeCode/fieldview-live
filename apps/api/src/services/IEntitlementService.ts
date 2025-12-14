/**
 * Entitlement Service Interfaces (ISP)
 * 
 * Segregated interfaces for entitlement operations.
 */

import type { Entitlement, PlaybackSession } from '@prisma/client';

export interface EntitlementValidationResult {
  valid: boolean;
  entitlement?: Entitlement;
  error?: string;
}

export interface CreateSessionRequest {
  metadata?: Record<string, unknown>;
}

export interface CreateSessionResponse {
  sessionId: string;
  startedAt: string; // ISO 8601
}

/**
 * Reader Interface (ISP)
 * 
 * Focused on reading entitlement data.
 */
export interface IEntitlementReader {
  validateToken(tokenId: string): Promise<EntitlementValidationResult>;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on writing entitlement operations.
 */
export interface IEntitlementWriter {
  createPlaybackSession(entitlementId: string, metadata?: Record<string, unknown>): Promise<PlaybackSession>;
}
