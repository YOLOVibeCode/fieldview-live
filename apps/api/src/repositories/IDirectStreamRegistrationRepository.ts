/**
 * DirectStreamRegistration Repository Interface (ISP: Read/Write segregation)
 * 
 * Handles registration tracking for DirectStream viewers.
 */

import type { DirectStreamRegistration, ViewerIdentity } from '@prisma/client';

export interface CreateRegistrationData {
  directStreamId: string;
  viewerIdentityId: string;
  wantsReminders: boolean;
}

export interface RegistrationWithViewer extends DirectStreamRegistration {
  viewerIdentity: ViewerIdentity;
}

/**
 * Read operations for DirectStreamRegistration
 */
export interface IDirectStreamRegistrationReader {
  /**
   * Find registration by stream and viewer
   */
  findByStreamAndViewer(
    streamId: string,
    viewerId: string
  ): Promise<DirectStreamRegistration | null>;

  /**
   * Find all registrations for a stream
   */
  findByStream(streamId: string): Promise<RegistrationWithViewer[]>;

  /**
   * Count total registrations for a stream
   */
  countByStream(streamId: string): Promise<number>;

  /**
   * Find only verified registrations for a stream
   */
  findVerifiedByStream(streamId: string): Promise<RegistrationWithViewer[]>;
}

/**
 * Write operations for DirectStreamRegistration
 */
export interface IDirectStreamRegistrationWriter {
  /**
   * Create a new registration
   */
  create(data: CreateRegistrationData): Promise<DirectStreamRegistration>;

  /**
   * Mark registration as verified
   */
  updateVerifiedAt(id: string, verifiedAt: Date): Promise<DirectStreamRegistration>;

  /**
   * Update last seen timestamp
   */
  updateLastSeenAt(id: string): Promise<DirectStreamRegistration>;
}

