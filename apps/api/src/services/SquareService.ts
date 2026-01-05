/**
 * Square Service Implementation
 * 
 * Implements ISquareReader and ISquareWriter.
 * Handles Square Connect onboarding flow.
 * 
 * Uses direct HTTP requests for OAuth (simpler than SDK for OAuth flow).
 */

import crypto from 'crypto';

import { BadRequestError } from '../lib/errors';
import { encrypt } from '../lib/encryption';
import { redisClient } from '../lib/redis';
import type { IOwnerAccountWriter } from '../repositories/IOwnerAccountRepository';

import type { ISquareReader, ISquareWriter, SquareConnectUrlData } from './ISquareService';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID || '';
const SQUARE_APP_SECRET = process.env.SQUARE_APPLICATION_SECRET || '';
const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
const SQUARE_REDIRECT_URI = process.env.SQUARE_REDIRECT_URI || 'http://localhost:4301/api/owners/square/callback';
const SQUARE_API_BASE = SQUARE_ENV === 'production' 
  ? 'https://connect.squareup.com' 
  : 'https://connect.squareupsandbox.com';
const APP_URL = process.env.APP_URL || 'http://localhost:4300';

const SQUARE_CONNECT_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
  'PAYMENTS_WRITE',
  'SETTLEMENTS_READ',
  // Card-on-file (Option 2): customers + cards must exist in same seller context as payments.
  'CUSTOMERS_READ',
  'CUSTOMERS_WRITE',
  'CARDS_READ',
  'CARDS_WRITE',
].join(' ');

function defaultReturnUrl(): string {
  return `${APP_URL.replace(/\/$/, '')}/owners/dashboard`;
}

function allowlistedReturnUrl(input: string): string {
  try {
    const appOrigin = new URL(APP_URL).origin;
    const candidate = new URL(input);
    if (candidate.origin !== appOrigin) return defaultReturnUrl();
    return candidate.toString();
  } catch {
    return defaultReturnUrl();
  }
}

type SquareConnectStatePayload = {
  ownerAccountId: string;
  returnUrl: string;
};

function parseStatePayload(raw: string): SquareConnectStatePayload {
  // Backward compat: older deployments stored only ownerAccountId.
  try {
    const parsed = JSON.parse(raw) as Partial<SquareConnectStatePayload>;
    if (typeof parsed.ownerAccountId === 'string' && parsed.ownerAccountId.length > 0) {
      return {
        ownerAccountId: parsed.ownerAccountId,
        returnUrl: allowlistedReturnUrl(typeof parsed.returnUrl === 'string' ? parsed.returnUrl : defaultReturnUrl()),
      };
    }
  } catch {
    // ignore
  }

  if (typeof raw === 'string' && raw.length > 0) {
    return { ownerAccountId: raw, returnUrl: defaultReturnUrl() };
  }

  throw new BadRequestError('Invalid or expired state token');
}

export class SquareService implements ISquareReader, ISquareWriter {
  constructor(private ownerAccountWriter: IOwnerAccountWriter) {}

  getAccountInfo(merchantId: string): Promise<{ merchantId: string; status: string } | null> {
    // TODO: Use Square API to get merchant account info
    // For now, return basic structure
    return Promise.resolve({
      merchantId,
      status: 'active',
    });
  }

  async generateConnectUrl(ownerAccountId: string, returnUrl: string): Promise<SquareConnectUrlData> {
    // Generate CSRF token (state)
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in Redis with ownerAccountId + allowlisted returnUrl (expires in 10 minutes)
    const payload: SquareConnectStatePayload = {
      ownerAccountId,
      returnUrl: allowlistedReturnUrl(returnUrl),
    };
    await redisClient.setex(`square:connect:${state}`, 600, JSON.stringify(payload));

    // Build Square Connect URL
    const connectUrl = new URL(`${SQUARE_API_BASE}/oauth2/authorize`);
    connectUrl.searchParams.set('client_id', SQUARE_APP_ID);
    connectUrl.searchParams.set('response_type', 'code');
    connectUrl.searchParams.set('scope', SQUARE_CONNECT_SCOPES);
    connectUrl.searchParams.set('session', 'false');
    connectUrl.searchParams.set('state', state);
    connectUrl.searchParams.set('redirect_uri', SQUARE_REDIRECT_URI);

    return {
      connectUrl: connectUrl.toString(),
      state,
    };
  }

  async handleConnectCallback(code: string, state: string): Promise<{ merchantId: string; returnUrl: string }> {
    // Verify state (CSRF protection)
    const raw = await redisClient.get(`square:connect:${state}`);
    if (!raw) {
      throw new BadRequestError('Invalid or expired state token');
    }
    const { ownerAccountId, returnUrl } = parseStatePayload(raw);

    // Exchange code for access token via HTTP
    const tokenUrl = `${SQUARE_API_BASE}/oauth2/token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        client_secret: SQUARE_APP_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: SQUARE_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      throw new BadRequestError('Failed to obtain Square access token');
    }

    const result = await response.json() as { 
      access_token?: string; 
      refresh_token?: string;
      expires_at?: string;
      merchant_id?: string;
    };
    
    if (!result.access_token || !result.merchant_id) {
      throw new BadRequestError('Failed to obtain Square access token');
    }

    // Discover owner (seller) location ID for marketplace payments.
    let squareLocationId: string | undefined;
    try {
      const locRes = await fetch(`${SQUARE_API_BASE}/v2/locations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${result.access_token}`,
          'Square-Version': '2024-01-18',
        },
      });
      if (locRes.ok) {
        const locBody = (await locRes.json()) as { locations?: Array<{ id?: string; status?: string }> };
        const locations = locBody.locations ?? [];
        const active = locations.find((l) => l.status === 'ACTIVE' && l.id) ?? null;
        const first = locations.find((l) => l.id) ?? null;
        squareLocationId = (active?.id ?? first?.id ?? undefined) as string | undefined;
      }
    } catch (error) {
      // Best-effort: do not block connect if locations cannot be fetched.
      // Location can be re-discovered later in payment flow.
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(result.access_token);
    const encryptedRefreshToken = result.refresh_token ? encrypt(result.refresh_token) : undefined;
    
    // Calculate token expiration (Square tokens typically expire in 30 days)
    // expires_at is ISO 8601 string if provided, otherwise default to 30 days
    let tokenExpiresAt: Date | undefined;
    if (result.expires_at) {
      tokenExpiresAt = new Date(result.expires_at);
    } else {
      // Default to 30 days from now if not provided
      tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Store merchant ID and encrypted tokens in OwnerAccount
    await this.ownerAccountWriter.update(ownerAccountId, {
      payoutProviderRef: result.merchant_id,
      squareAccessTokenEncrypted: encryptedAccessToken,
      squareRefreshTokenEncrypted: encryptedRefreshToken,
      squareTokenExpiresAt: tokenExpiresAt,
      ...(squareLocationId ? { squareLocationId } : {}),
    });

    // Clean up state token
    await redisClient.del(`square:connect:${state}`);

    return {
      merchantId: result.merchant_id,
      returnUrl,
    };
  }
}
