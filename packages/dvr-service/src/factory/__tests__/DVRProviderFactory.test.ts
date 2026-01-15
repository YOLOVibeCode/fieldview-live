/**
 * DVRProviderFactory Tests
 * 
 * TDD: Write tests first for factory pattern
 * Tests provider abstraction and drop-in replacement
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { DVRProviderFactory, DVRProviderConfig } from '../DVRProviderFactory';
import { MockDVRService } from '../../providers/mock/MockDVRService';
import { MuxDVRService } from '../../providers/mux/MuxDVRService';
import { CloudflareDVRService } from '../../providers/cloudflare/CloudflareDVRService';

describe('DVRProviderFactory (TDD)', () => {
  describe('createProvider', () => {
    it('should create Mock provider', () => {
      const config: DVRProviderConfig = {
        provider: 'mock',
        credentials: {},
      };

      const service = DVRProviderFactory.createProvider(config);

      expect(service).toBeInstanceOf(MockDVRService);
      expect(service.getProviderName()).toBe('mock');
    });

    it('should create Mux provider with credentials', () => {
      const config: DVRProviderConfig = {
        provider: 'mux',
        credentials: {
          tokenId: 'test-token-id',
          tokenSecret: 'test-token-secret',
        },
      };

      const service = DVRProviderFactory.createProvider(config);

      expect(service).toBeInstanceOf(MuxDVRService);
      expect(service.getProviderName()).toBe('mux');
    });

    it('should create Cloudflare provider with credentials', () => {
      const config: DVRProviderConfig = {
        provider: 'cloudflare',
        credentials: {
          apiKey: 'test-api-key',
          accountId: 'test-account-id',
        },
      };

      const service = DVRProviderFactory.createProvider(config);

      expect(service).toBeInstanceOf(CloudflareDVRService);
      expect(service.getProviderName()).toBe('cloudflare');
    });

    it('should throw error for unknown provider', () => {
      const config: DVRProviderConfig = {
        provider: 'unknown' as any,
        credentials: {},
      };

      expect(() => DVRProviderFactory.createProvider(config)).toThrow('Unknown DVR provider');
    });

    it('should throw error for missing Mux credentials', () => {
      const config: DVRProviderConfig = {
        provider: 'mux',
        credentials: {},
      };

      expect(() => DVRProviderFactory.createProvider(config)).toThrow('Missing required credentials');
    });

    it('should throw error for missing Cloudflare credentials', () => {
      const config: DVRProviderConfig = {
        provider: 'cloudflare',
        credentials: {},
      };

      expect(() => DVRProviderFactory.createProvider(config)).toThrow('Missing required credentials');
    });
  });

  describe('createFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should create Mock provider from env', () => {
      process.env.DVR_PROVIDER = 'mock';

      const service = DVRProviderFactory.createFromEnv();

      expect(service).toBeInstanceOf(MockDVRService);
    });

    it('should create Mux provider from env', () => {
      process.env.DVR_PROVIDER = 'mux';
      process.env.MUX_TOKEN_ID = 'env-token-id';
      process.env.MUX_TOKEN_SECRET = 'env-token-secret';

      const service = DVRProviderFactory.createFromEnv();

      expect(service).toBeInstanceOf(MuxDVRService);
    });

    it('should create Cloudflare provider from env', () => {
      process.env.DVR_PROVIDER = 'cloudflare';
      process.env.CLOUDFLARE_API_KEY = 'env-api-key';
      process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account-id';

      const service = DVRProviderFactory.createFromEnv();

      expect(service).toBeInstanceOf(CloudflareDVRService);
    });

    it('should default to Mock if no provider specified', () => {
      delete process.env.DVR_PROVIDER;

      const service = DVRProviderFactory.createFromEnv();

      expect(service).toBeInstanceOf(MockDVRService);
    });

    it('should throw error for missing Mux env credentials', () => {
      process.env.DVR_PROVIDER = 'mux';
      delete process.env.MUX_TOKEN_ID;
      delete process.env.MUX_TOKEN_SECRET;

      expect(() => DVRProviderFactory.createFromEnv()).toThrow('Missing required credentials');
    });
  });

  describe('Provider Switching (ISP Compliance)', () => {
    it('should allow switching between providers at runtime', () => {
      const mockConfig: DVRProviderConfig = { provider: 'mock', credentials: {} };
      const muxConfig: DVRProviderConfig = {
        provider: 'mux',
        credentials: { tokenId: 'test', tokenSecret: 'test' },
      };

      const mockService = DVRProviderFactory.createProvider(mockConfig);
      const muxService = DVRProviderFactory.createProvider(muxConfig);

      // Both implement same interface
      expect(mockService.getProviderName()).toBe('mock');
      expect(muxService.getProviderName()).toBe('mux');

      // Both should have all IDVRService methods
      expect(typeof mockService.startRecording).toBe('function');
      expect(typeof muxService.startRecording).toBe('function');
      expect(typeof mockService.createClip).toBe('function');
      expect(typeof muxService.createClip).toBe('function');
    });

    it('should allow dependency injection of provider', async () => {
      // Simulate application code that accepts IDVRService
      const useProvider = async (provider: any) => {
        const session = await provider.startRecording('test-stream', {});
        return session.id;
      };

      const mockService = DVRProviderFactory.createProvider({ provider: 'mock', credentials: {} });
      const muxService = DVRProviderFactory.createProvider({
        provider: 'mux',
        credentials: { tokenId: 'test', tokenSecret: 'test' },
      });

      // Mock fetch for Mux
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'mux-123', stream_key: 'abc', playback_ids: [], recording: {} } }),
      });

      const mockId = await useProvider(mockService);
      const muxId = await useProvider(muxService);

      expect(mockId).toBeDefined();
      expect(muxId).toBeDefined();
    });
  });
});

