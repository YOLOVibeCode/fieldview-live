/**
 * Stream Source Repository Interfaces (ISP)
 * 
 * Segregated interfaces for StreamSource operations.
 */

import type { StreamSource } from '@prisma/client';

/**
 * Reader Interface (ISP)
 */
export interface IStreamSourceReader {
  getByGameId(gameId: string): Promise<StreamSource | null>;
}
