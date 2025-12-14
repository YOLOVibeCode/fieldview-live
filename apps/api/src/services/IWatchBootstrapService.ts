/**
 * Watch Bootstrap Service Interfaces (ISP)
 * 
 * Segregated interfaces for watch bootstrap operations.
 */

export interface WatchBootstrapResponse {
  streamUrl: string;
  playerType: 'hls' | 'embed';
  state: 'not_started' | 'live' | 'ended' | 'unavailable';
  validTo: string; // ISO 8601
  gameInfo: {
    title: string;
    startsAt: string; // ISO 8601
  };
  protectionLevel: 'strong' | 'moderate' | 'best_effort';
}

/**
 * Reader Interface (ISP)
 * 
 * Focused on reading watch bootstrap data.
 */
export interface IWatchBootstrapReader {
  getBootstrap(tokenId: string): Promise<WatchBootstrapResponse>;
}
