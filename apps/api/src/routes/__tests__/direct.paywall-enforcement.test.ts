/**
 * Paywall enforcement regression tests.
 *
 * Proves the server NEVER hands the playable streamUrl / muxPlaybackId to a
 * caller without a valid entitlement, while still delivering it to entitled
 * callers (directly from /bootstrap when identity is supplied, and from
 * /verify-access after purchase).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createDirectRouter } from '../direct';
import { prisma } from '../../lib/prisma';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn() },
    viewerIdentity: { findUnique: vi.fn() },
    entitlement: { findFirst: vi.fn() },
  },
}));

const MUX_URL = 'https://stream.mux.com/abc123playbackid.m3u8';

function paywalledStream(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ds-paid',
    slug: 'paid-stream',
    status: 'active',
    gameId: 'game-1',
    ownerAccountId: 'owner-1',
    paywallEnabled: true,
    priceInCents: 4999,
    streamUrl: MUX_URL,
    chatEnabled: true,
    title: 'Paid Stream',
    game: {
      streamSource: { type: 'mux_managed', muxPlaybackId: 'abc123playbackid', protectionLevel: 'moderate' },
    },
    ...overrides,
  };
}

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', createDirectRouter());
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const viewerFindUnique = prisma.viewerIdentity.findUnique as unknown as ReturnType<typeof vi.fn>;
const entFindFirst = prisma.entitlement.findFirst as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/direct/:slug/bootstrap — paywall URL gating', () => {
  it('withholds streamUrl AND muxPlaybackId from an anonymous caller on a paywalled stream', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap');

    expect(res.status).toBe(200);
    expect(res.body.paywallEnabled).toBe(true);
    expect(res.body.streamLocked).toBe(true);
    expect(res.body.streamUrl).toBeNull();
    expect(res.body.muxPlaybackId).toBeNull();
    // Non-secret provider label may remain.
    expect(res.body.streamProvider).toBe('mux_managed');
    // The helper must not even look up a viewer when none was supplied.
    expect(viewerFindUnique).not.toHaveBeenCalled();
  });

  it('returns the streamUrl for a FREE (non-paywalled) stream', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream({ paywallEnabled: false }));

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap');

    expect(res.status).toBe(200);
    expect(res.body.streamLocked).toBe(false);
    expect(res.body.streamUrl).toBe(MUX_URL);
    expect(res.body.muxPlaybackId).toBe('abc123playbackid');
  });

  it('returns the streamUrl when the caller supplies an entitled viewerId', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    viewerFindUnique.mockResolvedValue({ id: 'viewer-1' });
    entFindFirst.mockResolvedValue({ id: 'ent-1' }); // valid, active, not expired

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap?viewerId=viewer-1');

    expect(res.status).toBe(200);
    expect(res.body.streamLocked).toBe(false);
    expect(res.body.streamUrl).toBe(MUX_URL);
    expect(res.body.muxPlaybackId).toBe('abc123playbackid');
  });

  it('withholds the streamUrl when a supplied viewerId has NO entitlement', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    viewerFindUnique.mockResolvedValue({ id: 'viewer-1' });
    entFindFirst.mockResolvedValue(null); // no valid entitlement

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap?viewerId=viewer-1');

    expect(res.status).toBe(200);
    expect(res.body.streamLocked).toBe(true);
    expect(res.body.streamUrl).toBeNull();
    expect(res.body.muxPlaybackId).toBeNull();
  });
});

describe('GET /api/direct/:slug/verify-access — gated URL delivery', () => {
  it('grants access AND returns the streamUrl for an entitled viewer', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    viewerFindUnique.mockResolvedValue({ id: 'viewer-1', email: 'v@example.com' });
    entFindFirst.mockResolvedValue({
      id: 'ent-1',
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2999-01-01'),
      tokenId: 'tok-1',
    });

    const res = await request(app()).get('/api/direct/paid-stream/verify-access?viewerId=viewer-1');

    expect(res.status).toBe(200);
    expect(res.body.hasAccess).toBe(true);
    expect(res.body.streamUrl).toBe(MUX_URL);
    expect(res.body.muxPlaybackId).toBe('abc123playbackid');
  });

  it('denies access AND returns NO streamUrl when there is no entitlement', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    viewerFindUnique.mockResolvedValue({ id: 'viewer-1', email: 'v@example.com' });
    entFindFirst.mockResolvedValue(null);

    const res = await request(app()).get('/api/direct/paid-stream/verify-access?viewerId=viewer-1');

    expect(res.status).toBe(200);
    expect(res.body.hasAccess).toBe(false);
    expect(res.body.streamUrl).toBeUndefined();
    expect(res.body.muxPlaybackId).toBeUndefined();
  });
});
