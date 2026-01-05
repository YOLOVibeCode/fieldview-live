/**
 * Square Client for Owner Accounts
 *
 * Creates Square client instances using owner's encrypted OAuth tokens.
 * Used for marketplace Model A: charge on owner's Square account with application fee.
 */

import { SquareClient, SquareEnvironment } from 'square';

import { decrypt } from './encryption';
import type { OwnerAccount } from '@prisma/client';

const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? SquareEnvironment.Production 
  : SquareEnvironment.Sandbox;

/**
 * Get Square client for an owner account using their encrypted access token.
 * Returns null if owner doesn't have Square connected.
 */
export function getOwnerSquareClient(ownerAccount: OwnerAccount): SquareClient | null {
  if (!ownerAccount.squareAccessTokenEncrypted) {
    return null;
  }

  try {
    const accessToken = decrypt(ownerAccount.squareAccessTokenEncrypted);
    
    // Check if token is expired (if expiration date is set)
    if (ownerAccount.squareTokenExpiresAt && ownerAccount.squareTokenExpiresAt < new Date()) {
      // Token expired - would need refresh token flow (TODO: implement refresh)
      // For now, return null to indicate token needs refresh
      return null;
    }

    return new SquareClient({
      token: accessToken,
      environment: SQUARE_ENVIRONMENT,
    });
  } catch (error) {
    console.error('Failed to decrypt Square access token:', error);
    return null;
  }
}

/**
 * Get Square location ID for an owner account.
 * For marketplace Model A, we need the owner's location ID.
 * TODO: Store owner's Square location ID in OwnerAccount or fetch from Square API
 * For now, we'll use the platform's location ID as fallback (not ideal for marketplace)
 */
export function getOwnerSquareLocationId(_ownerAccount: OwnerAccount): string | null {
  // TODO: Store owner's location ID when they connect Square
  // For now, return null to indicate we need to fetch it
  return null;
}

