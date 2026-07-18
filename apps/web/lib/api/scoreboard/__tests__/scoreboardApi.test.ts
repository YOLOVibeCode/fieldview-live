/**
 * Scoreboard API Client Tests (TDD - Test First)
 * 
 * Tests for centralized scoreboard API client with retry logic and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scoreboardApi } from '../scoreboardApi';
import { ApiError } from '@/lib/api-client';
import * as apiClientModule from '@/lib/api-client';

// Mock the apiRequest function
vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual('@/lib/api-client');
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

describe('ScoreboardApiClient', () => {
  const mockApiRequest = apiClientModule.apiRequest as ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetch()', () => {
    it('should use apiRequest helper to fetch scoreboard data', async () => {
      const mockResponse = {
        id: '123',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 10,
        awayScore: 8,
        homeJerseyColor: '#3B82F6',
        awayJerseyColor: '#EF4444',
        clockMode: 'stopped',
        clockSeconds: 0,
        clockStartedAt: null,
      };
      
      mockApiRequest.mockResolvedValue(mockResponse);
      
      const result = await scoreboardApi.fetch('test-slug');
      
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/api/direct/test-slug/scoreboard'),
        expect.objectContaining({
          method: 'GET',
          retries: 2,
        })
      );
      
      expect(result).toEqual({
        homeTeam: { name: 'Home', score: 10, color: '#3B82F6' },
        awayTeam: { name: 'Away', score: 8, color: '#EF4444' },
        period: 'Stopped',
        time: '00:00',
      });
    });

    it('should return defaults when 404 error occurs', async () => {
      mockApiRequest.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found'));
      
      const result = await scoreboardApi.fetch('test-slug');
      
      expect(result).toEqual({
        homeTeam: { name: 'Home', score: 0, color: '#3B82F6' },
        awayTeam: { name: 'Away', score: 0, color: '#EF4444' },
        period: undefined,
        time: undefined,
      });
    });

    it('should enhance error messages for 500 status', async () => {
      mockApiRequest.mockRejectedValue(new ApiError(500, 'SERVER_ERROR', 'Internal error'));
      
      await expect(scoreboardApi.fetch('test-slug')).rejects.toThrow(
        'Server error. Please try again in a moment.'
      );
    });

    it('should handle network errors with user-friendly message', async () => {
      mockApiRequest.mockRejectedValue(new Error('Failed to fetch'));
      
      await expect(scoreboardApi.fetch('test-slug')).rejects.toThrow(
        'Unable to connect to the server. Please check your internet connection.'
      );
    });
  });

  describe('updateScore()', () => {
    it('should use apiRequest helper to update score', async () => {
      const mockResponse = {
        id: '123',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 15,
        awayScore: 8,
        homeJerseyColor: '#3B82F6',
        awayJerseyColor: '#EF4444',
      };
      
      mockApiRequest.mockResolvedValue(mockResponse);
      
      const result = await scoreboardApi.updateScore('test-slug', 'home', 15);
      
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/api/direct/test-slug/scoreboard/viewer-update'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            viewerToken: undefined,
            field: 'homeScore',
            value: 15,
          }),
          retries: 1,
        })
      );
      
      expect(result.homeTeam.score).toBe(15);
    });

    it('should include auth token when provided', async () => {
      const mockResponse = {
        id: '123',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 20,
        awayScore: 8,
        homeJerseyColor: '#3B82F6',
        awayJerseyColor: '#EF4444',
      };
      
      mockApiRequest.mockResolvedValue(mockResponse);
      
      await scoreboardApi.updateScore('test-slug', 'away', 20, { viewerToken: 'viewer-token-123' });
      
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: { Authorization: 'Bearer viewer-token-123' },
        })
      );
    });

    it('should return user-friendly error for 400 status', async () => {
      mockApiRequest.mockRejectedValue(new ApiError(400, 'BAD_REQUEST', 'Invalid value'));
      
      await expect(scoreboardApi.updateScore('test-slug', 'home', 1000)).rejects.toThrow(
        'Invalid score value. Please enter a number between 0 and 999.'
      );
    });

    it('should return user-friendly error for 401 status', async () => {
      mockApiRequest.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Unauthorized'));
      
      await expect(scoreboardApi.updateScore('test-slug', 'home', 10)).rejects.toThrow(
        'You need to sign in to edit scores.'
      );
    });

    it('should return user-friendly error for 403 status', async () => {
      mockApiRequest.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Forbidden'));
      
      await expect(scoreboardApi.updateScore('test-slug', 'home', 10)).rejects.toThrow(
        'You do not have permission to edit scores.'
      );
    });

    it('should not retry client errors (400, 401, 403)', async () => {
      // This test verifies retry logic at the apiRequest level
      // We'll verify this in the api-client tests
      mockApiRequest.mockRejectedValue(new ApiError(400, 'BAD_REQUEST', 'Bad request'));
      
      await expect(scoreboardApi.updateScore('test-slug', 'home', 1000)).rejects.toThrow();
      
      // Should be called once (no retries for 4xx)
      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('streamUpdates()', () => {
    let mockEventSource: {
      addEventListener: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockEventSource = {
        addEventListener: vi.fn(),
        close: vi.fn(),
      };
      
      global.EventSource = vi.fn(() => mockEventSource as any) as any;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create SSE connection with correct URL', () => {
      const onUpdate = vi.fn();
      scoreboardApi.streamUpdates('test-slug', onUpdate);
      
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/direct/test-slug/scoreboard/stream')
      );
    });

    it('should register listeners for scoreboard events', () => {
      const onUpdate = vi.fn();
      scoreboardApi.streamUpdates('test-slug', onUpdate);
      
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
        'scoreboard_snapshot',
        expect.any(Function)
      );
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
        'scoreboard_update',
        expect.any(Function)
      );
    });

    it('should call onUpdate with transformed data and raw response', () => {
      const onUpdate = vi.fn();
      let snapshotHandler: any;
      
      mockEventSource.addEventListener.mockImplementation((event, handler) => {
        if (event === 'scoreboard_snapshot') {
          snapshotHandler = handler;
        }
      });
      
      scoreboardApi.streamUpdates('test-slug', onUpdate);
      
      const mockRawData = {
        id: '123',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 10,
        awayScore: 8,
        homeJerseyColor: '#3B82F6',
        awayJerseyColor: '#EF4444',
        clockMode: 'running',
        clockSeconds: 120,
        clockStartedAt: new Date().toISOString(),
      };
      
      snapshotHandler({ data: JSON.stringify(mockRawData) });
      
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          homeTeam: { name: 'Home', score: 10, color: '#3B82F6' },
          awayTeam: { name: 'Away', score: 8, color: '#EF4444' },
          period: 'Running',
        }),
        mockRawData
      );
    });

    it('should return cleanup function that closes connection', () => {
      const onUpdate = vi.fn();
      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate);
      
      cleanup();
      
      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });

  describe('updateTeamName()', () => {
    it('should update team name via apiRequest', async () => {
      const mockResponse = {
        id: '123',
        homeTeamName: 'New Home Team',
        awayTeamName: 'Away',
        homeScore: 0,
        awayScore: 0,
        homeJerseyColor: '#3B82F6',
        awayJerseyColor: '#EF4444',
      };
      
      mockApiRequest.mockResolvedValue(mockResponse);
      
      const result = await scoreboardApi.updateTeamName('test-slug', 'home', 'New Home Team');
      
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/api/direct/test-slug/scoreboard/viewer-update'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            viewerToken: undefined,
            field: 'homeTeamName',
            value: 'New Home Team',
          }),
        })
      );
      
      expect(result.homeTeam.name).toBe('New Home Team');
    });
  });

  describe('error handler', () => {
    it('should return correct user message for 404', async () => {
      mockApiRequest.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found'));
      
      // 404 should return defaults, not throw
      const result = await scoreboardApi.fetch('test-slug');
      expect(result.homeTeam.name).toBe('Home');
    });

    it('should return correct user message for 502', async () => {
      mockApiRequest.mockRejectedValue(new ApiError(502, 'BAD_GATEWAY', 'Bad gateway'));
      
      await expect(scoreboardApi.updateScore('test-slug', 'home', 10)).rejects.toThrow(
        'Server error. Please try again in a moment.'
      );
    });

    it('should return correct user message for 503', async () => {
      mockApiRequest.mockRejectedValue(new ApiError(503, 'UNAVAILABLE', 'Service unavailable'));
      
      await expect(scoreboardApi.updateScore('test-slug', 'home', 10)).rejects.toThrow(
        'Server error. Please try again in a moment.'
      );
    });
  });

  describe('clock display', () => {
    it('should format clock time as MM:SS', async () => {
      const mockResponse = {
        id: '123',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 0,
        awayScore: 0,
        homeJerseyColor: '#3B82F6',
        awayJerseyColor: '#EF4444',
        clockMode: 'stopped',
        clockSeconds: 125, // 2 minutes 5 seconds
        clockStartedAt: null,
      };
      
      mockApiRequest.mockResolvedValue(mockResponse);
      const result = await scoreboardApi.fetch('test-slug');
      
      expect(result.time).toBe('02:05');
      expect(result.period).toBe('Stopped');
    });

    it('should calculate live time for running clock', async () => {
      const now = Date.now();
      const startedAt = new Date(now - 3000); // Started 3 seconds ago
      
      const mockResponse = {
        id: '123',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 0,
        awayScore: 0,
        homeJerseyColor: '#3B82F6',
        awayJerseyColor: '#EF4444',
        clockMode: 'running',
        clockSeconds: 120, // Base 2 minutes
        clockStartedAt: startedAt.toISOString(),
      };
      
      mockApiRequest.mockResolvedValue(mockResponse);
      const result = await scoreboardApi.fetch('test-slug');
      
      // Should be ~123 seconds (2:03), allowing for small timing variance
      expect(result.time).toMatch(/02:0[23]/);
      expect(result.period).toBe('Running');
    });

    it('should map clockMode to period text', async () => {
      const testCases = [
        { clockMode: 'running', expected: 'Running' },
        { clockMode: 'paused', expected: 'Paused' },
        { clockMode: 'stopped', expected: 'Stopped' },
      ];

      for (const { clockMode, expected } of testCases) {
        const mockResponse = {
          id: '123',
          homeTeamName: 'Home',
          awayTeamName: 'Away',
          homeScore: 0,
          awayScore: 0,
          homeJerseyColor: '#3B82F6',
          awayJerseyColor: '#EF4444',
          clockMode,
          clockSeconds: 0,
          clockStartedAt: null,
        };
        
        mockApiRequest.mockResolvedValue(mockResponse);
        const result = await scoreboardApi.fetch('test-slug');
        
        expect(result.period).toBe(expected);
      }
    });

    it('should handle negative time', async () => {
      const mockResponse = {
        id: '123',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 0,
        awayScore: 0,
        homeJerseyColor: '#3B82F6',
        awayJerseyColor: '#EF4444',
        clockMode: 'stopped',
        clockSeconds: -65, // -1 minute 5 seconds
        clockStartedAt: null,
      };
      
      mockApiRequest.mockResolvedValue(mockResponse);
      const result = await scoreboardApi.fetch('test-slug');
      
      expect(result.time).toBe('-01:05');
    });
  });
});
