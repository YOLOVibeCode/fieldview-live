/**
 * DVRProviderFactory
 * 
 * Factory pattern for creating DVR service providers
 * Enables drop-in replacement and dependency injection
 * Follows ISP - all providers implement IDVRService
 */

import { IDVRService } from '../interfaces';
import { MockDVRService } from '../providers/mock/MockDVRService';
import { MuxDVRService } from '../providers/mux/MuxDVRService';
import { CloudflareDVRService } from '../providers/cloudflare/CloudflareDVRService';

export type DVRProvider = 'mock' | 'mux' | 'cloudflare';

export interface DVRProviderConfig {
  provider: DVRProvider;
  credentials: Record<string, any>;
}

export class DVRProviderFactory {
  /**
   * Create a DVR service provider from configuration
   * 
   * @param config Provider configuration with credentials
   * @returns IDVRService instance
   * @throws Error if provider is unknown or credentials are missing
   */
  static createProvider(config: DVRProviderConfig): IDVRService {
    switch (config.provider) {
      case 'mock':
        return new MockDVRService(config);

      case 'mux':
        if (!config.credentials.tokenId || !config.credentials.tokenSecret) {
          throw new Error('Missing required credentials for Mux: tokenId, tokenSecret');
        }
        return new MuxDVRService({
          tokenId: config.credentials.tokenId,
          tokenSecret: config.credentials.tokenSecret,
          baseUrl: config.credentials.baseUrl,
        });

      case 'cloudflare':
        if (!config.credentials.apiKey || !config.credentials.accountId) {
          throw new Error('Missing required credentials for Cloudflare: apiKey, accountId');
        }
        return new CloudflareDVRService({
          apiKey: config.credentials.apiKey,
          accountId: config.credentials.accountId,
          baseUrl: config.credentials.baseUrl,
        });

      default:
        throw new Error(`Unknown DVR provider: ${config.provider}`);
    }
  }

  /**
   * Create a DVR service provider from environment variables
   * 
   * Environment variables:
   * - DVR_PROVIDER: 'mock' | 'mux' | 'cloudflare' (default: 'mock')
   * 
   * Mux:
   * - MUX_TOKEN_ID
   * - MUX_TOKEN_SECRET
   * 
   * Cloudflare:
   * - CLOUDFLARE_API_KEY
   * - CLOUDFLARE_ACCOUNT_ID
   * 
   * @returns IDVRService instance
   * @throws Error if required env vars are missing
   */
  static createFromEnv(): IDVRService {
    const provider = (process.env.DVR_PROVIDER || 'mock') as DVRProvider;

    const config: DVRProviderConfig = {
      provider,
      credentials: {},
    };

    switch (provider) {
      case 'mock':
        // Mock has no required credentials
        break;

      case 'mux':
        if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
          throw new Error('Missing required credentials for Mux: MUX_TOKEN_ID, MUX_TOKEN_SECRET');
        }
        config.credentials = {
          tokenId: process.env.MUX_TOKEN_ID,
          tokenSecret: process.env.MUX_TOKEN_SECRET,
          baseUrl: process.env.MUX_BASE_URL,
        };
        break;

      case 'cloudflare':
        if (!process.env.CLOUDFLARE_API_KEY || !process.env.CLOUDFLARE_ACCOUNT_ID) {
          throw new Error('Missing required credentials for Cloudflare: CLOUDFLARE_API_KEY, CLOUDFLARE_ACCOUNT_ID');
        }
        config.credentials = {
          apiKey: process.env.CLOUDFLARE_API_KEY,
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
          baseUrl: process.env.CLOUDFLARE_BASE_URL,
        };
        break;

      default:
        throw new Error(`Unknown DVR provider: ${provider}`);
    }

    return this.createProvider(config);
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): DVRProvider[] {
    return ['mock', 'mux', 'cloudflare'];
  }
}

