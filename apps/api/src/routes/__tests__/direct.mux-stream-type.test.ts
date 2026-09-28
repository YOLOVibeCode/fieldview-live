/**
 * Paywall-free bootstrap muxStreamType matrix for GET /api/direct/:slug/bootstrap.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createDirectRouter } from '../direct';
import { prisma } from '../../lib/prisma';
import { errorHandler } from '../../middleware/errorHandler';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    directStreamEvent: { findUnique: vi.fn() },
    ownerAccount: { findUnique: vi.fn(), findFirst: vi.fn() },
    game: { findFirst: vi.fn(), create: vi.fn() },
    viewerIdentity: { upsert: vi.fn(), findUnique: vi.fn() },
    entitlement: { findFirst: vi.fn() },
  },
}));

const MUX_PLAYBACK = 'abc123playbackid';
const MUX_URL = `https://stream.mux.com/${MUX_PLAYBACK}.m3u8`;

function muxDirectStream(gameState: string | null) {
  return {
    id: 'ds-1',
    slug: 'mux-stream',
    status: 'active',
    gameId: gameState ? 'game-1' : null,
    ownerAccountId: 'owner-1',
    paywallEnabled: false,
    priceInCents: 0,
    streamUrl: MUX_URL,
    chatEnabled: true,
    title: 'Mux Stream',
    adminPassword: null,
    game: gameState
      ? {
          state: gameState,
          streamSource: {
            type: 'mux_managed',
            muxPlaybackId: MUX_PLAYBACK,
            protectionLevel: 'moderate',
          },
        }
      : null,
  };
}

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', createDirectRouter());
  a.use(errorHandler);
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const ownerFindUnique = prisma.ownerAccount.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  ownerFindUnique.mockResolvedValue({
    marketplaceSellerKey: null,
    paymentsConnectedAt: null,
  });
});

describe('GET /api/direct/:slug/bootstrap — muxStreamType', () => {
  it.each([
    ['active', 'live:dvr'],
    ['draft', 'live:dvr'],
    ['live', 'live:dvr'],
    ['ended', 'on-demand'],
    ['cancelled', 'on-demand'],
  ] as const)('game state %s → %s', async (gameState, expected) => {
    dsFindUnique.mockResolvedValue(muxDirectStream(gameState));
    const res = await request(app()).get('/api/direct/mux-stream/bootstrap');
    expect(res.status).toBe(200);
    expect(res.body.muxStreamType).toBe(expected);
  });

  it('returns live:dvr when game is missing', async () => {
    dsFindUnique.mockResolvedValue(muxDirectStream(null));
    const res = await request(app()).get('/api/direct/mux-stream/bootstrap');
    expect(res.status).toBe(200);
    expect(res.body.muxStreamType).toBe('live:dvr');
  });

  it('omits muxStreamType for BYO HLS', async () => {
    dsFindUnique.mockResolvedValue({
      ...muxDirectStream('active'),
      streamUrl: 'https://cdn.example.com/live.m3u8',
      game: {
        state: 'active',
        streamSource: { type: 'byo_hls', muxPlaybackId: null, protectionLevel: 'none' },
      },
    });
    const res = await request(app()).get('/api/direct/mux-stream/bootstrap');
    expect(res.status).toBe(200);
    expect(res.body.streamProvider).toBe('byo_hls');
    expect(res.body.muxStreamType).toBeUndefined();
  });
});
