/**
 * Scoreboard API Client
 * 
 * Centralized API client for scoreboard operations with retry logic and error handling.
 * Implements ISP (Interface Segregation Principle) with focused interfaces.
 */

import { apiRequest, ApiError } from '@/lib/api-client';
import { resolveClockSeconds, formatClock } from '@fieldview/data-model';
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
      const raw = await apiRequest<ApiScoreboardResponse>(
        `${this.baseUrl}/api/direct/${encodeURIComponent(slug)}/scoreboard`,
        {
          method: 'GET',
          retries: 2,
        } as any
      );
      return this.toScoreboardData(raw);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return this.getDefaultScoreboard();
      }
      throw this.enhanceError(error);
    }
  }

  streamUpdates(
    slug: string,
    onUpdate: (data: ScoreboardData) => void,
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
        onUpdate(this.toScoreboardData(rawData));
        
        if (reconnectAttempts > 0) {
          reconnectAttempts = 0;
          callbacks?.onReconnect?.();
        }
        isInitialConnection = false;
      };

      const handleUpdate = (event: MessageEvent) => {
        const rawData = JSON.parse(event.data);
        onUpdate(this.toScoreboardData(rawData));
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
    const { time } = this.calculateClockDisplay(response);
    const period = response.periodLabel
      ?? (response.period != null ? String(response.period) : undefined);
    const clockDirection = response.clockDirection ?? 'up';

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
      time: response.hideClock ? undefined : time,
      sportId: response.sport,
      clockMode: response.clockMode,
      clockSeconds: response.clockSeconds,
      clockStartedAt: response.clockStartedAt ?? null,
      clockDirection,
      hideClock: response.hideClock ?? false,
    };
  }

  /**
   * Calculate clock display from API response using sport-aware direction.
   */
  private calculateClockDisplay(response: ApiScoreboardResponse): {
    time?: string;
  } {
    const { clockMode, clockSeconds, clockStartedAt, clockDirection = 'up' } = response;

    if (clockSeconds === undefined || clockSeconds === null) {
      return {};
    }

    const resolved = resolveClockSeconds({
      mode: (clockMode as 'stopped' | 'running' | 'paused') ?? 'stopped',
      clockDirection,
      clockSeconds,
      clockStartedAt: clockStartedAt ?? null,
    });

    return { time: formatClock(resolved) };
  }
}

// Export singleton instance
export const scoreboardApi = new ScoreboardApiClient();
