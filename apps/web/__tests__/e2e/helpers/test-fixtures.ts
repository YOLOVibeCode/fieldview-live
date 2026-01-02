/**
 * Test Fixtures & Helpers
 * 
 * Shared utilities for E2E tests.
 */

import type { APIRequestContext } from '@playwright/test';

export function assertLiveWebEnv(): void {
  if (process.env.LIVE_TEST_MODE !== '1') {
    throw new Error('LIVE web tests require LIVE_TEST_MODE=1. Refusing to run.');
  }
  const base = process.env.PLAYWRIGHT_BASE_URL;
  if (!base) {
    throw new Error('Set PLAYWRIGHT_BASE_URL (e.g., http://localhost:3000) for LIVE web tests.');
  }
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL;
  if (!apiBase) {
    throw new Error('Set PLAYWRIGHT_API_BASE_URL (e.g., http://localhost:4301) for LIVE web tests.');
  }
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${uniqueSuffix()}@fieldview.live`;
}

export function uniqueSlug(prefix: string): string {
  return `${prefix}${uniqueSuffix()}`;
}

export function uniqueCode(prefix: string): string {
  return `${prefix}${uniqueSuffix()}`;
}

function uniqueSuffix(): string {
  // Prevent collisions when multiple fixtures are created within the same millisecond.
  const rand = Math.random().toString(16).slice(2, 10);
  return `${Date.now()}_${rand}`;
}

export interface TestOwner {
  email: string;
  password: string;
  token: string;
}

export interface TestGame {
  id: string;
  keywordCode: string;
}

/**
 * Create a test owner account via API.
 */
export async function createTestOwner(
  request: APIRequestContext,
  email?: string,
  password = 'password12345'
): Promise<TestOwner> {
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const ownerEmail = email || uniqueEmail('owner');

  const response = await request.post(`${apiBase}/api/owners/register`, {
    data: {
      email: ownerEmail,
      password,
      name: 'E2E Test Owner',
      type: 'individual',
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to create test owner: ${response.status()} ${text}`);
  }

  const json = (await response.json()) as any;
  return {
    email: ownerEmail,
    password,
    token: json.token.token as string,
  };
}

/**
 * Create a test game via API.
 */
export async function createTestGame(
  request: APIRequestContext,
  ownerToken: string,
  overrides?: Partial<{
    title: string;
    homeTeam: string;
    awayTeam: string;
    startsAt: Date;
    priceCents: number;
    state: string;
  }>
): Promise<TestGame> {
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const startsAt = overrides?.startsAt || new Date(Date.now() + 120_000);

  const response = await request.post(`${apiBase}/api/owners/games`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: {
      title: overrides?.title || 'E2E Test Game',
      homeTeam: overrides?.homeTeam || 'Home Team',
      awayTeam: overrides?.awayTeam || 'Away Team',
      startsAt: startsAt.toISOString(),
      priceCents: overrides?.priceCents || 700,
      currency: 'USD',
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to create test game: ${response.status()} ${text}`);
  }

  const game = (await response.json()) as any;
  const gameId = game.id as string;

  // Activate if requested
  if (overrides?.state === 'active' || !overrides?.state) {
    await request.patch(`${apiBase}/api/owners/games/${gameId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { state: 'active' },
    });
  }

  return {
    id: gameId,
    keywordCode: game.keywordCode as string,
  };
}

/**
 * Create a test organization and channel for watch-link tests.
 */
export interface TestOrg {
  shortName: string;
  id: string;
}

export interface TestChannel {
  teamSlug: string;
  id: string;
}

/**
 * Cleanup helper: Call test cleanup endpoint
 * Requires SuperAdmin token in environment
 */
export async function cleanupTestData(request: APIRequestContext): Promise<void> {
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  const superAdminToken = process.env.TEST_SUPERADMIN_TOKEN;
  const cleanupSecret = process.env.TEST_CLEANUP_SECRET;
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  try {
    let authHeader: Record<string, string> = {};

    if (cleanupSecret) {
      authHeader = { 'X-Test-Cleanup-Secret': cleanupSecret };
    } else if (superAdminToken) {
      authHeader = { Authorization: `Bearer ${superAdminToken}` };
    } else if (adminEmail && adminPassword) {
      // Best-effort: login as admin to obtain a session token (non-production cleanup is allowed for any active admin)
      const loginResp = await request.post(`${apiBase}/api/admin/login`, {
        data: { email: adminEmail, password: adminPassword },
      });

      if (!loginResp.ok()) {
        return;
      }

      const loginJson = (await loginResp.json()) as {
        sessionToken: string;
        mfaRequired: boolean;
      };

      if (loginJson.mfaRequired || !loginJson.sessionToken) {
        return;
      }

      authHeader = { Authorization: `Bearer ${loginJson.sessionToken}` };
    } else {
      // No way to authenticate cleanup
      return;
    }

    const response = await request.post(`${apiBase}/api/test/cleanup`, {
      headers: {
        ...authHeader,
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      console.warn(`Test cleanup failed: ${response.status()} ${text}`);
    }
  } catch (error) {
    console.warn('Test cleanup error:', error);
    // Don't throw - cleanup is best-effort
  }
}

export async function createTestOrg(
  request: APIRequestContext,
  ownerToken: string,
  shortName?: string
): Promise<TestOrg> {
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  // shortName must be uppercase alphanumeric per schema
  const orgShortName =
    shortName ||
    (() => {
      const timePart = Date.now().toString(36).toUpperCase().slice(-8);
      const randPart = Math.random().toString(36).slice(2, 6).toUpperCase();
      // Max length 20
      return `TESTORG${timePart}${randPart}`.slice(0, 20).replace(/[^A-Z0-9]/g, '');
    })();

  const response = await request.post(
    `${apiBase}/api/owners/me/watch-links/orgs`,
    {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        shortName: orgShortName,
        name: 'Test Organization', // API uses 'name' not 'displayName'
      },
    }
  );

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to create test org: ${response.status()} ${text}`);
  }

  const json = (await response.json()) as any;
  return {
    shortName: orgShortName,
    id: json.id as string,
  };
}

export async function createTestChannel(
  request: APIRequestContext,
  ownerToken: string,
  orgShortName: string,
  teamSlug?: string,
  accessMode: 'public_free' | 'pay_per_view' = 'public_free',
  priceCents?: number
): Promise<TestChannel> {
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL!;
  // teamSlug must be URL-safe: alphanumeric, underscores, hyphens
  const slug = teamSlug || `team${uniqueSuffix()}`;

  const data: Record<string, unknown> = {
    teamSlug: slug,
    displayName: 'Test Team',
    accessMode,
    streamType: 'mux_playback',
    muxPlaybackId: 'test-playback-id', // Fake ID for testing
  };

  if (accessMode === 'pay_per_view') {
    data.priceCents = priceCents || 500;
    data.currency = 'USD';
  }

  const response = await request.post(
    `${apiBase}/api/owners/me/watch-links/orgs/${orgShortName}/channels`,
    {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data,
    }
  );

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to create test channel: ${response.status()} ${text}`);
  }

  const json = (await response.json()) as any;
  return {
    teamSlug: slug,
    id: json.id as string,
  };
}

