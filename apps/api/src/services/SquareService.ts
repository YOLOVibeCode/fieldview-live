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
import { redisClient } from '../lib/redis';
import type { IOwnerAccountWriter } from '../repositories/IOwnerAccountRepository';
import type { ISquareReader, ISquareWriter, SquareConnectUrlData } from './ISquareService';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID || '';
const SQUARE_APP_SECRET = process.env.SQUARE_APPLICATION_SECRET || '';
const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
const SQUARE_REDIRECT_URI = process.env.SQUARE_REDIRECT_URI || 'http://localhost:3001/api/owners/square/callback';
const SQUARE_API_BASE = SQUARE_ENV === 'production' 
  ? 'https://connect.squareup.com' 
  : 'https://connect.squareupsandbox.com';

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

  async generateConnectUrl(ownerAccountId: string, _returnUrl: string): Promise<SquareConnectUrlData> {
    // Generate CSRF token (state)
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in Redis with ownerAccountId (expires in 10 minutes)
    await redisClient.setex(`square:connect:${state}`, 600, ownerAccountId);

    // Build Square Connect URL
    const connectUrl = new URL(`${SQUARE_API_BASE}/oauth2/authorize`);
    connectUrl.searchParams.set('client_id', SQUARE_APP_ID);
    connectUrl.searchParams.set('response_type', 'code');
    connectUrl.searchParams.set('scope', 'MERCHANT_PROFILE_READ PAYMENTS_READ SETTLEMENTS_READ');
    connectUrl.searchParams.set('session', 'false');
    connectUrl.searchParams.set('state', state);
    connectUrl.searchParams.set('redirect_uri', SQUARE_REDIRECT_URI);

    return {
      connectUrl: connectUrl.toString(),
      state,
    };
  }

  async handleConnectCallback(code: string, state: string): Promise<{ merchantId: string }> {
    // Verify state (CSRF protection)
    const ownerAccountId = await redisClient.get(`square:connect:${state}`);
    if (!ownerAccountId) {
      throw new BadRequestError('Invalid or expired state token');
    }

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

    const result = await response.json() as { access_token?: string; merchant_id?: string };
    
    if (!result.access_token || !result.merchant_id) {
      throw new BadRequestError('Failed to obtain Square access token');
    }

    // Store merchant ID (payoutProviderRef) in OwnerAccount
    await this.ownerAccountWriter.update(ownerAccountId, {
      payoutProviderRef: result.merchant_id,
    });

    // Clean up state token
    await redisClient.del(`square:connect:${state}`);

    return {
      merchantId: result.merchant_id,
    };
  }
}
