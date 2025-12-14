/**
 * Playback Session Repository Interfaces (ISP)
 * 
 * Segregated interfaces for PlaybackSession CRUD operations.
 */

import type { PlaybackSession } from '@prisma/client';

export interface CreatePlaybackSessionData {
  entitlementId: string;
  startedAt?: Date;
}

export interface UpdatePlaybackSessionData {
  endedAt?: Date | null;
}

/**
 * Reader Interface (ISP)
 */
export interface IPlaybackSessionReader {
  getById(id: string): Promise<PlaybackSession | null>;
  listByEntitlementId(entitlementId: string): Promise<PlaybackSession[]>;
}

/**
 * Writer Interface (ISP)
 */
export interface IPlaybackSessionWriter {
  create(data: CreatePlaybackSessionData): Promise<PlaybackSession>;
  update(id: string, data: UpdatePlaybackSessionData): Promise<PlaybackSession>;
}
