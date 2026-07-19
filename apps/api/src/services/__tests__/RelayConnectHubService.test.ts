/**
 * RelayConnectHubService tests.
 *
 * The relay is mocked via an injected fetch function — no network. Verifies
 * request construction (URL/method/headers/body) and response parsing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RelayConnectHubService } from '../RelayConnectHubService';
import type { RelayConfig } from '../../lib/relay';

const config: RelayConfig = {
  baseUrl: 'https://relay.test',
  productKey: 'fieldview',
  apiKey: 'nsins_dk_test',
};

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('RelayConnectHubService', () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  let svc: RelayConnectHubService;

  beforeEach(() => {
    fetchFn = vi.fn();
    svc = new RelayConnectHubService(config, fetchFn as unknown as typeof globalThis.fetch);
  });

  describe('buildAuthorizeUrl', () => {
    it('builds the Connect Hub authorize URL with recipient_key', () => {
      const url = svc.buildAuthorizeUrl('owner-123');
      expect(url).toBe('https://relay.test/connect/fieldview/oauth/authorize?recipient_key=owner-123');
    });

    it('includes the post-connect redirect when provided', () => {
      const url = svc.buildAuthorizeUrl('owner-123', 'https://app.fieldview.live/owners/dashboard');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('recipient_key')).toBe('owner-123');
      expect(parsed.searchParams.get('redirect')).toBe('https://app.fieldview.live/owners/dashboard');
    });

    it('does not call the network', () => {
      svc.buildAuthorizeUrl('owner-123');
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe('acceptAgreement', () => {
    it('POSTs the agreement version with bearer auth', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ version: 'v1' }));
      const result = await svc.acceptAgreement('owner-123', 'v1');

      expect(fetchFn).toHaveBeenCalledTimes(1);
      const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://relay.test/connect/fieldview/recipients/owner-123/agreement');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer nsins_dk_test');
      expect(JSON.parse(init.body as string)).toEqual({ version: 'v1' });
      expect(result).toEqual({ accepted: true, version: 'v1' });
    });

    it('throws when the relay rejects', async () => {
      fetchFn.mockResolvedValue(jsonResponse({}, false));
      await expect(svc.acceptAgreement('owner-123', 'v1')).rejects.toThrow(/agreement/i);
    });
  });

  describe('getFrontendConfig', () => {
    it('maps snake_case relay fields', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse({ application_id: 'sq0idp-abc', environment: 'production', location_id: 'LOC1' }),
      );
      const cfg = await svc.getFrontendConfig('owner-123');
      expect(cfg).toEqual({ applicationId: 'sq0idp-abc', environment: 'production', locationId: 'LOC1' });
    });

    it('defaults environment to sandbox and accepts camelCase', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ applicationId: 'sandbox-sq0idb-x' }));
      const cfg = await svc.getFrontendConfig('owner-123');
      expect(cfg.environment).toBe('sandbox');
      expect(cfg.applicationId).toBe('sandbox-sq0idb-x');
    });

    it('throws when application_id is missing', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ environment: 'sandbox' }));
      await expect(svc.getFrontendConfig('owner-123')).rejects.toThrow(/application_id/i);
    });
  });

  describe('getRecipientStatus', () => {
    it('reports connected when frontend-config resolves', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ application_id: 'sq0idp-abc', environment: 'sandbox' }));
      const status = await svc.getRecipientStatus('owner-123');
      expect(status).toEqual({ connected: true, recipientKey: 'owner-123' });
    });

    it('reports not connected when the relay errors', async () => {
      fetchFn.mockResolvedValue(jsonResponse({}, false));
      const status = await svc.getRecipientStatus('owner-123');
      expect(status).toEqual({ connected: false, recipientKey: 'owner-123' });
    });
  });
});
