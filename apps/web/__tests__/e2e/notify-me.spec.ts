import { test, expect } from '@playwright/test';

/**
 * Notify-Me E2E Tests
 *
 * Verifies the "notify me" email signup flow on production.
 * Note: These tests require a scheduled stream to show the bell icon.
 */

const PROD_URL = 'https://fieldview.live/direct/tchs';
const PROD_API = 'https://api.fieldview.live';
const ADMIN_PASSWORD = 'tchs2026';

async function getAdminToken(): Promise<string> {
  const resp = await fetch(`${PROD_API}/api/direct/tchs/unlock-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!resp.ok) throw new Error(`Admin unlock failed: ${resp.status}`);
  const data = await resp.json();
  return data.token;
}

async function setScheduledStart(token: string, iso: string | null): Promise<void> {
  const resp = await fetch(`${PROD_API}/api/direct/tchs/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ scheduledStartAt: iso }),
  });
  if (!resp.ok) throw new Error(`Settings update failed: ${resp.status}`);
}

test.describe('Notify-Me Signup', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test.afterAll(async () => {
    // Clean up: clear scheduledStartAt
    await setScheduledStart(adminToken, null);
  });

  test('viewer enters email and gets subscribed via API', async () => {
    // Direct API test — doesn't need a browser
    const email = `e2e-test-${Date.now()}@example.com`;

    const resp = await fetch(`${PROD_API}/api/public/direct/tchs/notify-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    expect(resp.ok).toBe(true);
    const data = await resp.json();
    expect(data.status).toBe('subscribed');
    expect(data.viewerId).toBeTruthy();
  });

  test('already-subscribed viewer gets correct status', async () => {
    const email = `e2e-repeat-${Date.now()}@example.com`;

    // First signup
    const resp1 = await fetch(`${PROD_API}/api/public/direct/tchs/notify-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    expect(resp1.ok).toBe(true);
    const data1 = await resp1.json();
    expect(data1.status).toBe('subscribed');

    // Second signup — same email
    const resp2 = await fetch(`${PROD_API}/api/public/direct/tchs/notify-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    expect(resp2.ok).toBe(true);
    const data2 = await resp2.json();
    expect(data2.status).toBe('already_subscribed');
  });

  test('admin sets scheduledStartAt via settings', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await setScheduledStart(adminToken, futureDate);

    // Verify it comes back in bootstrap
    const resp = await fetch(`${PROD_API}/api/direct/tchs/bootstrap`);
    expect(resp.ok).toBe(true);
    const data = await resp.json();
    expect(data.scheduledStartAt).toBeTruthy();

    // Clean up
    await setScheduledStart(adminToken, null);
  });

  test('subscribeById returns already_subscribed when viewer already subscribed', async () => {
    const email = `e2e-byid-${Date.now()}@example.com`;

    const subscribeResp = await fetch(`${PROD_API}/api/public/direct/tchs/notify-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    expect(subscribeResp.ok).toBe(true);
    const subscribeData = await subscribeResp.json();
    expect(subscribeData.status).toBe('subscribed');
    const viewerId = subscribeData.viewerId;
    expect(viewerId).toBeTruthy();

    const byIdResp = await fetch(`${PROD_API}/api/public/direct/tchs/notify-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerIdentityId: viewerId }),
    });
    expect(byIdResp.ok).toBe(true);
    const byIdData = await byIdResp.json();
    expect(byIdData.status).toBe('already_subscribed');
    expect(byIdData.viewerId).toBe(viewerId);
  });

  test('GET status returns subscribed true after subscribe, false for unknown viewer', async () => {
    const email = `e2e-status-${Date.now()}@example.com`;

    const subscribeResp = await fetch(`${PROD_API}/api/public/direct/tchs/notify-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    expect(subscribeResp.ok).toBe(true);
    const subscribeData = await subscribeResp.json();
    const viewerId = subscribeData.viewerId;

    const statusResp = await fetch(
      `${PROD_API}/api/public/direct/tchs/notify-me/status?viewerIdentityId=${encodeURIComponent(viewerId)}`,
    );
    expect(statusResp.ok).toBe(true);
    const statusData = await statusResp.json();
    expect(statusData.subscribed).toBe(true);

    // Non-subscribed viewer: use a random UUID (no registration)
    const unknownResp = await fetch(
      `${PROD_API}/api/public/direct/tchs/notify-me/status?viewerIdentityId=00000000-0000-0000-0000-000000000001`,
    );
    expect(unknownResp.ok).toBe(true);
    const unknownData = await unknownResp.json();
    expect(unknownData.subscribed).toBe(false);
  });

  test('DELETE unsubscribe then GET status returns subscribed false', async () => {
    const email = `e2e-unsub-${Date.now()}@example.com`;

    const subscribeResp = await fetch(`${PROD_API}/api/public/direct/tchs/notify-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    expect(subscribeResp.ok).toBe(true);
    const subscribeData = await subscribeResp.json();
    const viewerId = subscribeData.viewerId;

    const deleteResp = await fetch(`${PROD_API}/api/public/direct/tchs/notify-me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerIdentityId: viewerId }),
    });
    expect(deleteResp.ok).toBe(true);
    const deleteData = await deleteResp.json();
    expect(deleteData.status).toBe('unsubscribed');

    const statusResp = await fetch(
      `${PROD_API}/api/public/direct/tchs/notify-me/status?viewerIdentityId=${encodeURIComponent(viewerId)}`,
    );
    expect(statusResp.ok).toBe(true);
    const statusData = await statusResp.json();
    expect(statusData.subscribed).toBe(false);
  });
});
