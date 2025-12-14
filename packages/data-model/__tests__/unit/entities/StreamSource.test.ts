import { describe, it, expect } from 'vitest';
import type { StreamSource } from '@/entities/StreamSource';
import { STREAM_SOURCE_PROTECTION } from '@/entities/StreamSource';

describe('StreamSource', () => {
  it('maps protection levels correctly', () => {
    expect(STREAM_SOURCE_PROTECTION.mux_managed).toBe('strong');
    expect(STREAM_SOURCE_PROTECTION.byo_rtmp).toBe('strong');
    expect(STREAM_SOURCE_PROTECTION.byo_hls).toBe('moderate');
    expect(STREAM_SOURCE_PROTECTION.external_embed).toBe('best_effort');
  });
  
  it('supports mux_managed type', () => {
    const source: StreamSource = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      gameId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'mux_managed',
      protectionLevel: 'strong',
      muxAssetId: 'asset_123',
      muxPlaybackId: 'playback_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    expect(source.type).toBe('mux_managed');
    expect(source.muxAssetId).toBe('asset_123');
  });
});
