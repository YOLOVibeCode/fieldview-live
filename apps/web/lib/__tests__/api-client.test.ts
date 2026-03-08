/**
 * API Client Tests (TDD - Test First)
 * 
 * Tests for enhanced apiRequest with retry logic and exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, ApiError } from '../api-client';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('apiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should retry network failures (fetch throws)', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      });

    const result = await apiRequest('/test', { retries: 2 } as any);

    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(result).toEqual({ data: 'success' });
  });

  it('should retry 502 status codes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: { code: 'BAD_GATEWAY', message: 'Bad gateway' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      });

    const result = await apiRequest('/test', { retries: 1 } as any);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'success' });
  });

  it('should retry 503 status codes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { code: 'UNAVAILABLE', message: 'Service unavailable' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      });

    const result = await apiRequest('/test', { retries: 1 } as any);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'success' });
  });

  it('should NOT retry 400 status codes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'BAD_REQUEST', message: 'Bad request' } }),
    });

    await expect(apiRequest('/test', { retries: 2 } as any)).rejects.toThrow(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for 4xx
  });

  it('should NOT retry 401 status codes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }),
    });

    await expect(apiRequest('/test', { retries: 2 } as any)).rejects.toThrow(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry 403 status codes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
    });

    await expect(apiRequest('/test', { retries: 2 } as any)).rejects.toThrow(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry 404 status codes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
    });

    await expect(apiRequest('/test', { retries: 2 } as any)).rejects.toThrow(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff (100ms, 200ms, 400ms)', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    
    // Mock setTimeout to capture delays
    global.setTimeout = ((fn: any, delay: number) => {
      if (delay > 0) delays.push(delay);
      return originalSetTimeout(fn, 0); // Execute immediately for test speed
    }) as any;

    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      });

    try {
      await apiRequest('/test', { retries: 3 } as any);
    } finally {
      global.setTimeout = originalSetTimeout;
    }

    // Verify exponential backoff: 100ms, 200ms, 400ms
    expect(delays).toEqual([100, 200, 400]);
  });

  it('should respect max retries configuration', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(apiRequest('/test', { retries: 1 } as any)).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  it('should return ApiError with correct statusCode for HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: 'SERVER_ERROR', message: 'Internal error' } }),
    });

    try {
      await apiRequest('/test');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).code).toBe('SERVER_ERROR');
    }
  });

  it('should include original error in details for network errors', async () => {
    const originalError = new Error('Network failure');
    mockFetch.mockRejectedValue(originalError);

    try {
      await apiRequest('/test', { retries: 0 } as any);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
      expect((err as ApiError).code).toBe('NETWORK_ERROR');
    }
  });
});
