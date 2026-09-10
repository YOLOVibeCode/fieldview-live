import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../prisma';
import { buildReceiptStreamUrl } from '../receipt-stream-url';

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('buildReceiptStreamUrl', () => {
  it('returns /direct/{slug} for direct stream purchases', async () => {
    vi.stubEnv('APP_URL', 'https://fieldview.live');
    dsFindUnique.mockResolvedValue({ slug: 'my-stream' });

    const url = await buildReceiptStreamUrl(
      { directStreamId: 'ds-1', gameId: null },
      'token-abc',
    );

    expect(url).toBe('https://fieldview.live/direct/my-stream');
  });

  it('returns /stream/{token} for game purchases', async () => {
    vi.stubEnv('APP_URL', 'https://fieldview.live');

    const url = await buildReceiptStreamUrl(
      { directStreamId: null, gameId: 'game-1' },
      'token-abc',
    );

    expect(url).toBe('https://fieldview.live/stream/token-abc');
    expect(dsFindUnique).not.toHaveBeenCalled();
  });

  it('falls back to /stream/{token} when direct stream slug missing', async () => {
    vi.stubEnv('APP_URL', 'https://fieldview.live');
    dsFindUnique.mockResolvedValue(null);

    const url = await buildReceiptStreamUrl(
      { directStreamId: 'ds-missing', gameId: null },
      'token-abc',
    );

    expect(url).toBe('https://fieldview.live/stream/token-abc');
  });
});
