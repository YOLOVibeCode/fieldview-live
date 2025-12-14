/**
 * Square Service Implementation
 * 
 * Implements ISquareReader and ISquareWriter.
 * Handles Square Connect onboarding flow.
 */

import { Client, Environment } from 'square';
import crypto from 'crypto';

import { BadRequestError } from '../lib/errors';
import { redisClient } from '../lib/redis';
import type { IOwnerAccountWriter } from '../repositories/IOwnerAccountRepository';
import type { ISquareReader, ISquareWriter, SquareConnectUrlData } from './ISquareService';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID || '';
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const SQUARE_ENV = (process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox) as Environment;
const SQUARE_REDIRECT_URI = process.env.SQUARE_REDIRECT_URI || 'http://localhost:3001/api/owners/square/callback';

export class SquareService implements ISquareReader, ISquareWriter {
  private squareClient: Client;

  constructor(private ownerAccountWriter: IOwnerAccountWriter) {
    this.squareClient = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: SQUARE_ENV,
    });
  }

  async getAccountInfo(merchantId: string): Promise<{ merchantId: string; status: string } | null> {
    try {
      // TODO: Use Square API to get merchant account info
      // For now, return basic structure
      return {
        merchantId,
        status: 'active',
      };
    } catch {
      return null;
    }
  }

  async generateConnectUrl(ownerAccountId: string, returnUrl: string): Promise<SquareConnectUrlData> {
    // Generate CSRF token (state)
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in Redis with ownerAccountId (expires in 10 minutes)
    await redisClient.setex(`square:connect:${state}`, 600, ownerAccountId);

    // Build Square Connect URL
    const connectUrl = new URL('https://connect.squareup.com/oauth2/authorize');
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

    // Exchange code for access token
    const oauthApi = this.squareClient.oAuthApi;
    const response = await oauthApi.obtainToken({
      clientId: SQUARE_APP_ID,
      clientSecret: process.env.SQUARE_APPLICATION_SECRET || '',
      code,
      grantType: 'authorization_code',
      redirectUri: SQUARE_REDIRECT_URI,
    });

    const result = response.result;
    if (!result || !result.accessToken || !result.merchantId) {
      throw new BadRequestError('Failed to obtain Square access token');
    }

    // Store merchant ID (payoutProviderRef) in OwnerAccount
    await this.ownerAccountWriter.update(ownerAccountId, {
      payoutProviderRef: result.merchantId,
    });

    // Clean up state token
    await redisClient.del(`square:connect:${state}`);

    return {
      merchantId: result.merchantId,
    };
  }
}
