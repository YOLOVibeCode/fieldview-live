import { Writable } from 'stream';

import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { loggerOptions } from '../logger';

function capture(): { log: pino.Logger; lines: () => string } {
  let out = '';
  const sink = new Writable({
    write(chunk: Buffer, _enc, done) {
      out += chunk.toString();
      done();
    },
  });
  return { log: pino({ ...loggerOptions, level: 'info' }, sink), lines: () => out };
}

describe('logger redaction', () => {
  it('never writes credential values, at the top level or nested', () => {
    const { log, lines } = capture();

    log.info(
      {
        ownerAccountId: 'owner-1',
        password: 'TOP-SECRET-1',
        sessionCookie: 'TOP-SECRET-2',
        connection: { provider: 'veo', secrets: { sessionCookie: 'TOP-SECRET-3' }, credentials: 'TOP-SECRET-4' },
        req: { headers: { authorization: 'Bearer TOP-SECRET-5', cookie: 'TOP-SECRET-6' } },
        init: { headers: { Authorization: 'Bearer TOP-SECRET-7', Cookie: 'TOP-SECRET-8' } },
        token: { accessToken: 'TOP-SECRET-9' },
      },
      'camera source lookup'
    );

    const written = lines();
    expect(written).not.toMatch(/TOP-SECRET/);
    expect(written).toContain('[redacted]');
  });

  it('keeps the non-secret fields needed to debug', () => {
    const { log, lines } = capture();

    log.info({ ownerAccountId: 'owner-1', connection: { provider: 'veo', password: 'x' }, statuses: { live: 1 } }, 'ok');

    const entry = JSON.parse(lines()) as Record<string, unknown>;
    expect(entry.ownerAccountId).toBe('owner-1');
    expect(entry.connection).toEqual({ provider: 'veo', password: '[redacted]' });
    expect(entry.statuses).toEqual({ live: 1 });
    expect(entry.msg).toBe('ok');
  });
});
