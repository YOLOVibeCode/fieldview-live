import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IEmailProvider } from '../IEmailProvider';

/**
 * RelayEmailProvider reads NOCTUSOFT_RELAY_BASE_URL / NOCTUSOFT_API_KEY at
 * module load, so each test sets env then imports a fresh module instance.
 */
async function freshProvider(): Promise<IEmailProvider> {
  vi.resetModules();
  const mod = await import('../RelayEmailProvider');
  return new mod.RelayEmailProvider();
}

const SAVED = {
  NOCTUSOFT_RELAY_BASE_URL: process.env.NOCTUSOFT_RELAY_BASE_URL,
  NOCTUSOFT_API_KEY: process.env.NOCTUSOFT_API_KEY,
  APP_ENV: process.env.APP_ENV,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
  NODE_ENV: process.env.NODE_ENV,
};

function clearEnv() {
  for (const k of Object.keys(SAVED)) delete process.env[k];
}

describe('RelayEmailProvider', () => {
  beforeEach(() => {
    clearEnv();
    process.env.NOCTUSOFT_RELAY_BASE_URL = 'https://api.noctusoft.com';
    process.env.NOCTUSOFT_API_KEY = 'deploy-key-123';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearEnv();
    for (const [k, v] of Object.entries(SAVED)) {
      if (v !== undefined) process.env[k] = v;
    }
  });

  it('POSTs to <base>/email/send with Bearer auth and X-App-Env, mapping fields', async () => {
    process.env.RAILWAY_ENVIRONMENT = 'production';
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    const provider = await freshProvider();
    await provider.sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>', text: 'hi' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.noctusoft.com/email/send');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer deploy-key-123');
    expect(init.headers['X-App-Env']).toBe('production');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>', text: 'hi' });
    expect(body.from).toBe('noreply@fieldview.live');
  });

  it('sends X-App-Env: dev when running in the development env', async () => {
    process.env.RAILWAY_ENVIRONMENT = 'development';
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    const provider = await freshProvider();
    await provider.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'hi' });

    expect(fetchMock.mock.calls[0][1].headers['X-App-Env']).toBe('dev');
  });

  it('sends X-App-Env: uat and lets the relay tag (provider stays env-agnostic)', async () => {
    process.env.RAILWAY_ENVIRONMENT = 'uat';
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    const provider = await freshProvider();
    await provider.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'hi' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-App-Env']).toBe('uat');
    // The provider does NOT pre-tag the subject — that's the relay's job.
    expect(JSON.parse(init.body).subject).toBe('Hi');
  });

  it('throws when NOCTUSOFT_RELAY_BASE_URL is missing', async () => {
    delete process.env.NOCTUSOFT_RELAY_BASE_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const provider = await freshProvider();
    await expect(provider.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'hi' })).rejects.toThrow(
      /NOCTUSOFT_RELAY_BASE_URL/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when NOCTUSOFT_API_KEY is missing', async () => {
    delete process.env.NOCTUSOFT_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const provider = await freshProvider();
    await expect(provider.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'hi' })).rejects.toThrow(
      /NOCTUSOFT_API_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on a non-2xx relay response, surfacing status + detail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ status: 502, text: async () => 'Email failed: upstream down' });
    vi.stubGlobal('fetch', fetchMock);

    const provider = await freshProvider();
    await expect(provider.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'hi' })).rejects.toThrow(
      /Relay email failed \(502\).*upstream down/,
    );
  });

  it('normalizes a trailing slash on the base URL', async () => {
    process.env.NOCTUSOFT_RELAY_BASE_URL = 'https://api.noctusoft.com/';
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    const provider = await freshProvider();
    await provider.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'hi' });

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.noctusoft.com/email/send');
  });
});
