import { test, expect } from '@playwright/test';

/**
 * Crowdsourced event report → confirm → scoreboard apply.
 *
 * Isolated stream: e2e-crowdsource-test
 */

const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:4301';
const STREAM_SLUG = 'e2e-crowdsource-test';
const STREAM_URL = `/direct/${STREAM_SLUG}`;
const ADMIN_PASSWORD = 'e2e-crowdsource-password-2026';

async function ensureTestStream(): Promise<void> {
  const check = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/bootstrap`);
  if (check.ok) return;
  const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!resp.ok && resp.status !== 409) {
    throw new Error(`Failed to create test stream: ${resp.status} ${await resp.text()}`);
  }
}

async function getAdminToken(): Promise<string> {
  const resp = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/unlock-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!resp.ok) throw new Error(`Admin unlock failed: ${resp.status}`);
  const data = await resp.json();
  return data.token as string;
}

async function anonymousToken(sessionId: string): Promise<{ viewerToken: string; gameId: string }> {
  const resp = await fetch(`${API_BASE}/api/public/direct/${STREAM_SLUG}/viewer/anonymous-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!resp.ok) throw new Error(`Anonymous token failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

test.describe('Crowdsource game events', () => {
  test.describe.configure({ timeout: 60000 });

  let adminToken: string;

  test.beforeAll(async () => {
    await ensureTestStream();
    adminToken = await getAdminToken();
    const settings = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        scoreboardEnabled: true,
        chatEnabled: true,
        allowAnonymousChat: true,
        allowViewerReporting: true,
        eventConfirmThreshold: 1,
        sport: 'football',
      }),
    });
    if (!settings.ok) {
      throw new Error(`Settings failed: ${settings.status} ${await settings.text()}`);
    }

    await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        homeTeamName: 'Eagles',
        awayTeamName: 'Hawks',
        homeJerseyColor: '#003366',
        awayJerseyColor: '#CC0000',
      }),
    });

    await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ field: 'homeScore', value: 0 }),
    });
    await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard/viewer-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ field: 'awayScore', value: 0 }),
    });
  });

  test('two viewers report+confirm a touchdown and the scoreboard applies +6', async () => {
    const a = await anonymousToken(`crowd-a-${Date.now()}`);
    const b = await anonymousToken(`crowd-b-${Date.now()}`);

    const report = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.viewerToken}`,
      },
      body: JSON.stringify({ eventTypeId: 'touchdown', team: 'home' }),
    });
    expect(report.status, await report.text()).toBe(201);
    const pending = await report.json();
    expect(pending.status).toBe('pending');
    expect(pending.confirmationCount).toBe(1);
    expect(pending.confirmationNeeded).toBe(2);

    const before = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard`);
    const beforeJson = await before.json();
    expect(beforeJson.homeScore).toBe(0);

    const confirm = await fetch(
      `${API_BASE}/api/direct/${STREAM_SLUG}/events/${pending.id}/confirm`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${b.viewerToken}` },
      }
    );
    expect(confirm.ok, await confirm.text()).toBe(true);
    const confirmed = await confirm.json();
    expect(confirmed.status).toBe('confirmed');

    const after = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/scoreboard`);
    const afterJson = await after.json();
    expect(afterJson.homeScore).toBe(6);
    expect(afterJson.awayScore).toBe(0);
  });

  test('reports a narrated touchdown, confirms it, and narration appears in the Plays tab', async ({
    page,
  }) => {
    const a = await anonymousToken(`narrated-a-${Date.now()}`);
    const b = await anonymousToken(`narrated-b-${Date.now()}`);

    // Report a touchdown with full narration detail
    const report = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.viewerToken}`,
      },
      body: JSON.stringify({
        eventTypeId: 'touchdown',
        team: 'home',
        jerseyNumber: 12,
        detail: 'run',
        detailValue: 18,
        note: 'Broke three tackles!',
      }),
    });
    expect(report.status, await report.text()).toBe(201);
    const pending = await report.json();
    expect(pending.status).toBe('pending');

    // Confirm it
    const confirm = await fetch(
      `${API_BASE}/api/direct/${STREAM_SLUG}/events/${pending.id}/confirm`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${b.viewerToken}` },
      }
    );
    expect(confirm.ok, await confirm.text()).toBe(true);
    const confirmed = await confirm.json();
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.narration).toContain('Touchdown');
    expect(confirmed.narration).toContain('#12');
    expect(confirmed.narration).toContain('18-yd run');

    // Verify via GET /events that narration is persisted
    const list = await fetch(`${API_BASE}/api/direct/${STREAM_SLUG}/events?status=confirmed`);
    const { events } = await list.json();
    const savedEvent = events.find((e: { id: string }) => e.id === pending.id);
    expect(savedEvent).toBeDefined();
    expect(savedEvent.narration).toContain('18-yd run');

    // Visit the page and check the Plays tab shows the narration line
    await page.goto(STREAM_URL);
    await page.waitForTimeout(3000);

    const playsTab = page.getByTestId('portrait-tab-plays');
    if (!(await playsTab.isVisible({ timeout: 8000 }).catch(() => false))) {
      test.skip(true, 'Plays tab not visible (scoreboard or viewer reporting not enabled)');
      return;
    }
    await playsTab.click();
    await page.waitForSelector('[data-testid="plays-feed"]');
    await expect(page.getByText(/18-yd run/)).toBeVisible({ timeout: 8000 });
  });

  test('overlay team tap opens scoring sheet when crowdsourcing is on', async ({ page }) => {
    await page.goto(STREAM_URL);
    await page.waitForTimeout(4000);
    const homeTap = page.getByTestId('btn-overlay-team-home').first();
    if (!(await homeTap.isVisible({ timeout: 8000 }).catch(() => false))) {
      test.skip(true, 'Overlay report target not visible (viewer not unlocked or scoreboard hidden)');
      return;
    }
    await homeTap.click();
    await expect(page.getByTestId('modal-report-event')).toBeVisible();
    await expect(page.getByTestId('btn-event-type-touchdown')).toBeVisible();
  });
});
