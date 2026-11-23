/**
 * A superadmin create or update that carries a stream URL pins it, so the camera
 * poller leaves it alone; clearing the URL clears the pin.
 */
import type { DirectStreamEvent } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ICreateDirectStreamEventInput,
  IDirectStreamEventReader,
  IDirectStreamEventWriter,
  IUpdateDirectStreamEventInput,
} from '../../repositories/IDirectStreamEventRepository';
import { DirectStreamEventService } from '../DirectStreamEventService';

const OLD_URL = 'https://stream.example.com/old.m3u8';
const NEW_URL = 'https://stream.example.com/new.m3u8';

describe('DirectStreamEventService and the stream URL pin', () => {
  let existing: Partial<DirectStreamEvent> | null;
  const create = vi.fn<[ICreateDirectStreamEventInput], Promise<DirectStreamEvent>>();
  const update = vi.fn<[string, IUpdateDirectStreamEventInput], Promise<DirectStreamEvent>>();
  let service: DirectStreamEventService;

  beforeEach(() => {
    existing = { id: 'ev-1', streamUrl: OLD_URL, streamUrlPinnedAt: null };
    create.mockReset().mockResolvedValue({ id: 'ev-1' } as DirectStreamEvent);
    update.mockReset().mockResolvedValue({ id: 'ev-1' } as DirectStreamEvent);
    const reader = { getById: vi.fn(() => Promise.resolve(existing)) } as unknown as IDirectStreamEventReader;
    const writer = { create, update } as unknown as IDirectStreamEventWriter;
    service = new DirectStreamEventService(reader, writer);
  });

  const base = { directStreamId: 'ds-1', eventSlug: 'game-1', title: 'Game 1' };

  it('pins the URL of a page created with one', async () => {
    await service.createEvent({ ...base, streamUrl: NEW_URL });

    expect(create.mock.calls[0][0]).toMatchObject({ streamUrl: NEW_URL, streamUrlPinnedAt: expect.any(Date) as Date });
  });

  it('pins nothing on a page created without a URL', async () => {
    await service.createEvent(base);

    expect(create.mock.calls[0][0]).not.toHaveProperty('streamUrlPinnedAt');
  });

  it('pins a changed URL and unpins a cleared one', async () => {
    await service.updateEvent('ev-1', { streamUrl: NEW_URL });
    expect(update.mock.calls[0][1]).toMatchObject({ streamUrl: NEW_URL, streamUrlPinnedAt: expect.any(Date) as Date });

    await service.updateEvent('ev-1', { streamUrl: null });
    expect(update.mock.calls[1][1]).toMatchObject({ streamUrl: null, streamUrlPinnedAt: null });
  });

  it('leaves the pin alone when the URL is the same or not sent', async () => {
    await service.updateEvent('ev-1', { streamUrl: OLD_URL });
    await service.updateEvent('ev-1', { title: 'Renamed' });

    expect(update.mock.calls[0][1]).not.toHaveProperty('streamUrlPinnedAt');
    expect(update.mock.calls[1][1]).not.toHaveProperty('streamUrlPinnedAt');
  });
});
