import { describe, it, expect, vi } from 'vitest';

import { BadRequestError } from '../../../lib/errors';
import { ConnectionExpiredError } from '../interfaces';
import { VeoConnector } from '../providers/veo/VeoConnector';

const CLUB_URL = 'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';

describe('VeoConnector', () => {
  it('accepts an already-seeded session cookie, verifies it, and returns what to store', async () => {
    const verifySession = vi.fn(async () => {});
    const connector = new VeoConnector({ verifySession });

    const result = await connector.connect({
      email: 'coach@example.com',
      clubUrl: CLUB_URL,
      sessionCookie: '  _session=abc  ',
    });

    expect(verifySession).toHaveBeenCalledWith('_session=abc');
    expect(result).toEqual({
      config: { email: 'coach@example.com', clubUrl: CLUB_URL },
      secrets: { sessionCookie: '_session=abc' },
    });
  });

  it('turns an email + password into a session via the seeder, and does not keep the password', async () => {
    const seed = vi.fn(async () => '_session=seeded');
    const verifySession = vi.fn(async () => {});
    const connector = new VeoConnector({ verifySession, sessionSeeder: { seed } });

    const result = await connector.connect({ email: 'coach@example.com', clubUrl: CLUB_URL, password: 'pw' });

    expect(seed).toHaveBeenCalledWith({ email: 'coach@example.com', password: 'pw' });
    expect(verifySession).toHaveBeenCalledWith('_session=seeded');
    expect(result.secrets).toEqual({ sessionCookie: '_session=seeded' });
    expect(JSON.stringify(result)).not.toContain('pw');
  });

  it('refuses a password login when no seeder is available on this host', async () => {
    const connector = new VeoConnector({ verifySession: async () => {} });

    await expect(
      connector.connect({ email: 'coach@example.com', clubUrl: CLUB_URL, password: 'pw' })
    ).rejects.toThrow(/not available/i);
  });

  it('rejects input with neither a password nor a session cookie', async () => {
    const connector = new VeoConnector({ verifySession: async () => {} });

    await expect(connector.connect({ email: 'coach@example.com', clubUrl: CLUB_URL })).rejects.toBeInstanceOf(
      BadRequestError
    );
  });

  it('rejects a club URL that has no club in it', async () => {
    const connector = new VeoConnector({ verifySession: async () => {} });

    await expect(
      connector.connect({ email: 'coach@example.com', clubUrl: 'https://app.veo.co/', sessionCookie: '_session=abc' })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejects an invalid email', async () => {
    const connector = new VeoConnector({ verifySession: async () => {} });

    await expect(
      connector.connect({ email: 'not-an-email', clubUrl: CLUB_URL, sessionCookie: '_session=abc' })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('does not return anything to store when the session fails verification', async () => {
    const connector = new VeoConnector({
      verifySession: async () => {
        throw new ConnectionExpiredError();
      },
    });

    await expect(
      connector.connect({ email: 'coach@example.com', clubUrl: CLUB_URL, sessionCookie: '_session=dead' })
    ).rejects.toBeInstanceOf(ConnectionExpiredError);
  });
});
