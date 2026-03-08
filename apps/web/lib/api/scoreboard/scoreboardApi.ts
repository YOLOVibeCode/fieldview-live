/**
 * Scoreboard API Client
 * 
 * Centralized API client for scoreboard operations with retry logic and error handling.
 * Implements ISP (Interface Segregation Principle) with focused interfaces.
 */

import { apiRequest, ApiError } from '@/lib/api-client';
import type {
  IScoreboardReader,
  IScoreboardWriter,
  ScoreboardData,
  ApiScoreboardResponse,
} from './types';

class ScoreboardApiClient implements IScoreboardReader, IScoreboardWriter {
  private baseUrl: string;

  constructor(baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301') {
    this.baseUrl = baseUrl;
  }

  // IScoreboardReader implementation
  async fetch(slug: string): Promise<ScoreboardData> {
    try {
      const data = await apiRequest<ApiScoreboardResponse>(
        `${this.baseUrl}/api/direct/${encodeURIComponent(slug)}/scoreboard`,
        {
          method: 'GET',
          retries: 2, // Retry network failures
        } as any
      );
      return this.toScoreboardData(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // 404 is not an error - return defaults
        return this.getDefaultScoreboard();
      }
      throw this.enhanceError(error);
    }
  }

  streamUpdates(
    slug: string,
    onUpdate: (data: ScoreboardData, rawResponse: ApiScoreboardResponse) => void,
    callbacks?: {
      onDisconnect?: () => void;
      onReconnect?: () => void;
    }
  ): () => void {
    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isCleanedUp = false;
    let isInitialConnection = true;

    const connect = () => {
      if (isCleanedUp) return;

      eventSource = new EventSource(
        `${this.baseUrl}/api/direct/${encodeURIComponent(slug)}/scoreboard/stream`
      );

      const handleSnapshot = (event: MessageEvent) => {
        const rawData = JSON.parse(event.data);
        onUpdate(this.toScoreboardData(rawData), rawData);
        
        // Reset attempts on successful snapshot
        if (reconnectAttempts > 0) {
          reconnectAttempts = 0;
          callbacks?.onReconnect?.();
        }
        isInitialConnection = false;
      };

      const handleUpdate = (event: MessageEvent) => {
        const rawData = JSON.parse(event.data);
        onUpdate(this.toScoreboardData(rawData), rawData);
      };

      const handleError = () => {
        if (isCleanedUp) return;

        eventSource?.close();
        callbacks?.onDisconnect?.();

        // Calculate exponential backoff (1s, 2s, 4s, 8s, ..., max 30s)
        const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;

        // Schedule reconnection
        reconnectTimer = setTimeout(() => {
          if (!isCleanedUp) {
            connect();
          }
        }, backoffMs);
      };

      eventSource.addEventListener('scoreboard_snapshot', handleSnapshot);
      eventSource.addEventListener('scoreboard_update', handleUpdate);
      eventSource.addEventListener('error', handleError);
    };

    // Initial connection
    connect();

    // Cleanup function
    return () => {
      isCleanedUp = true;
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }

  // IScoreboardWriter implementation
  async updateScore(
    slug: string,
    team: 'home' | 'away',
    score: number,
    auth?: { viewerToken?: string; adminToken?: string }
  ): Promise<ScoreboardData> {
    const field = team === 'home' ? 'homeScore' : 'awayScore';

    try {
      const data = await apiRequest<ApiScoreboardResponse>(
        `${this.baseUrl}/api/direct/${encodeURIComponent(slug)}/scoreboard/viewer-update`,
        {
          method: 'POST',
          headers: auth?.adminToken || auth?.viewerToken
            ? { Authorization: `Bearer ${auth.adminToken || auth.viewerToken}` }
            : undefined,
          body: JSON.stringify({
            viewerToken: auth?.viewerToken,
            field,
            value: score,
          }),
          retries: 1, // Retry once for network/gateway errors
        } as any
      );
      return this.toScoreboardData(data);
    } catch (error) {
      throw this.enhanceError(error);
    }
  }

  async updateTeamName(
    slug: string,
    team: 'home' | 'away',
    name: string,
    auth?: { viewerToken?: string; adminToken?: string }
  ): Promise<ScoreboardData> {
    const field = team === 'home' ? 'homeTeamName' : 'awayTeamName';

    try {
      const data = await apiRequest<ApiScoreboardResponse>(
        `${this.baseUrl}/api/direct/${encodeURIComponent(slug)}/scoreboard/viewer-update`,
        {
          method: 'POST',
          headers: auth?.adminToken || auth?.viewerToken
            ? { Authorization: `Bearer ${auth.adminToken || auth.viewerToken}` }
            : undefined,
          body: JSON.stringify({
            viewerToken: auth?.viewerToken,
            field,
            value: name,
          }),
          retries: 1,
        } as any
      );
      return this.toScoreboardData(data);
    } catch (error) {
      throw this.enhanceError(error);
    }
  }

  // Helper: Enhance errors with user-friendly messages
  private enhanceError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      // Add user-friendly message based on error type
      const userMessage = this.getUserMessage(error);
      return new ApiError(error.status, error.code, userMessage, error.details);
    }

    // Network error
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'Unable to connect to the server. Please check your internet connection.',
      { originalError: error }
    );
  }

  // Helper: Get user-friendly error messages
  private getUserMessage(error: ApiError): string {
    switch (error.status) {
      case 400:
        return 'Invalid score value. Please enter a number between 0 and 999.';
      case 401:
        return 'You need to sign in to edit scores.';
      case 403:
        return 'You do not have permission to edit scores.';
      case 404:
        return 'Scoreboard not found. Please refresh the page.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again in a moment.';
      case 0:
        return 'Network error. Please check your connection.';
      default:
        return error.message || 'Unable to update score. Please try again.';
    }
  }

  private getDefaultScoreboard(): ScoreboardData {
    return {
      homeTeam: { name: 'Home', score: 0, color: '#3B82F6' },
      awayTeam: { name: 'Away', score: 0, color: '#EF4444' },
      period: undefined,
      time: undefined,
    };
  }

  private toScoreboardData(response: ApiScoreboardResponse): ScoreboardData {
    const { time, period } = this.calculateClockDisplay(response);
    
    return {
      homeTeam: {
        name: response.homeTeamName,
        score: response.homeScore,
        color: response.homeJerseyColor,
      },
      awayTeam: {
        name: response.awayTeamName,
        score: response.awayScore,
        color: response.awayJerseyColor,
      },
      period,
      time,
    };
  }

  /**
   * Calculate clock display from API response.
   * If clock is running, compute live time based on clockStartedAt.
   */
  private calculateClockDisplay(response: ApiScoreboardResponse): {
    time?: string;
    period?: string;
  } {
    const { clockMode, clockSeconds, clockStartedAt } = response;

    // Map clockMode to period text
    let period: string | undefined;
    if (clockMode === 'running') {
      period = 'Running';
    } else if (clockMode === 'paused') {
      period = 'Paused';
    } else if (clockMode === 'stopped') {
      period = 'Stopped';
    }

    // Calculate time display
    let time: string | undefined;
    if (clockSeconds !== undefined && clockSeconds !== null) {
      let totalSeconds = clockSeconds;

      // If clock is running and we have a start time, calculate live elapsed time
      if (clockMode === 'running' && clockStartedAt) {
        const elapsedMs = Date.now() - new Date(clockStartedAt).getTime();
        totalSeconds = clockSeconds + Math.floor(elapsedMs / 1000);
      }

      // Format as MM:SS
      time = this.formatTime(totalSeconds);
    }

    return { time, period };
  }

  /**
   * Format seconds as MM:SS
   */
  private formatTime(totalSeconds: number): string {
    const absSeconds = Math.abs(totalSeconds);
    const minutes = Math.floor(absSeconds / 60);
    const seconds = absSeconds % 60;
    const sign = totalSeconds < 0 ? '-' : '';
    return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

// Export singleton instance
export const scoreboardApi = new ScoreboardApiClient();
