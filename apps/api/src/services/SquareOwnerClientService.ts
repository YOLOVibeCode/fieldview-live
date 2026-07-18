/**
 * Square Owner Client Service
 *
 * Creates owner-scoped Square clients for Marketplace Model A.
 * Handles access token refresh and seller location discovery.
 */

import { SquareClient, SquareEnvironment } from 'square';

import { BadRequestError } from '../lib/errors';
import { decrypt, encrypt } from '../lib/encryption';
import { logger } from '../lib/logger';
import type { IOwnerAccountWriter } from '../repositories/IOwnerAccountRepository';

import type { OwnerAccount } from '@prisma/client';

const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
const SQUARE_API_BASE =
  SQUARE_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

const SQUARE_SDK_ENVIRONMENT =
  process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox;

// Refresh if expired or expiring soon (24h).
const REFRESH_SKEW_MS = 24 * 60 * 60 * 1000;

type RefreshTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  merchant_id?: string;
};

type ListLocationsResponse = {
  locations?: Array<{ id?: string; status?: string }>;
};

export class SquareOwnerClientService {
  constructor(private ownerAccountWriter: IOwnerAccountWriter) {}

  async getClient(ownerAccount: OwnerAccount): Promise<SquareClient | null> {
    const accessToken = await this.getValidAccessToken(ownerAccount);
    if (!accessToken) return null;

    return new SquareClient({
      token: accessToken,
      environment: SQUARE_SDK_ENVIRONMENT,
    });
  }

  async ensureLocationId(ownerAccount: OwnerAccount): Promise<string | null> {
    if (ownerAccount.squareLocationId) return ownerAccount.squareLocationId;

    const accessToken = await this.getValidAccessToken(ownerAccount);
    if (!accessToken) return null;

    const locationId = await this.fetchPrimaryLocationId(accessToken);
    if (!locationId) return null;

    await this.ownerAccountWriter.update(ownerAccount.id, { squareLocationId: locationId });
    return locationId;
  }

  private async getValidAccessToken(ownerAccount: OwnerAccount): Promise<string | null> {
    if (!ownerAccount.squareAccessTokenEncrypted) return null;

    let accessToken: string;
    try {
      accessToken = decrypt(ownerAccount.squareAccessTokenEncrypted);
    } catch (error) {
      logger.error({ error, ownerAccountId: ownerAccount.id }, 'Failed to decrypt owner Square access token');
      return null;
    }

    const expiresAt = ownerAccount.squareTokenExpiresAt ?? null;
    const shouldRefresh = expiresAt ? expiresAt.getTime() <= Date.now() + REFRESH_SKEW_MS : false;
    if (!shouldRefresh) return accessToken;

    if (!ownerAccount.squareRefreshTokenEncrypted) {
      return null;
    }

    let refreshToken: string;
    try {
      refreshToken = decrypt(ownerAccount.squareRefreshTokenEncrypted);
    } catch (error) {
      logger.error({ error, ownerAccountId: ownerAccount.id }, 'Failed to decrypt owner Square refresh token');
      return null;
    }

    const refreshed = await this.refreshAccessToken(refreshToken);
    const encryptedAccessToken = encrypt(refreshed.accessToken);
    const encryptedRefreshToken = refreshed.refreshToken ? encrypt(refreshed.refreshToken) : undefined;

    await this.ownerAccountWriter.update(ownerAccount.id, {
      ...(refreshed.merchantId ? { payoutProviderRef: refreshed.merchantId } : {}),
      squareAccessTokenEncrypted: encryptedAccessToken,
      squareRefreshTokenEncrypted: encryptedRefreshToken,
      squareTokenExpiresAt: refreshed.expiresAt,
    });

    return refreshed.accessToken;
  }

  private async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    merchantId?: string;
  }> {
    const appId = process.env.SQUARE_APPLICATION_ID || '';
    const appSecret = process.env.SQUARE_APPLICATION_SECRET || '';
    if (!appId || !appSecret) {
      throw new BadRequestError('Square application credentials are not configured');
    }

    const tokenUrl = `${SQUARE_API_BASE}/oauth2/token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new BadRequestError('Failed to refresh Square access token');
    }

    const result = (await response.json()) as RefreshTokenResponse;
    if (!result.access_token) {
      throw new BadRequestError('Failed to refresh Square access token');
    }

    const expiresAt = result.expires_at ? new Date(result.expires_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresAt,
      merchantId: result.merchant_id,
    };
  }

  private async fetchPrimaryLocationId(accessToken: string): Promise<string | null> {
    const url = `${SQUARE_API_BASE}/v2/locations`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
      },
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Failed to fetch Square locations for owner');
      return null;
    }

    const body = (await response.json()) as ListLocationsResponse;
    const locations = body.locations ?? [];
    const active = locations.find((l) => l.status === 'ACTIVE' && l.id) ?? null;
    const first = locations.find((l) => l.id) ?? null;
    return (active?.id ?? first?.id ?? null) as string | null;
  }
}


