/**
 * Mux Client Initialization
 * 
 * Centralizes Mux SDK client setup.
 */

import Mux from '@mux/mux-node';

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID || '';
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET || '';

/**
 * Ensure Mux is configured before making Mux API calls.
 *
 * Note: Do not throw at module import time (tests and non-streaming code paths
 * should be able to load the app without Mux configured).
 */
export function assertMuxConfigured(): void {
  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    throw new Error('MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set');
  }
}

export const muxClient = new Mux({
  tokenId: MUX_TOKEN_ID,
  tokenSecret: MUX_TOKEN_SECRET,
});
