/**
 * useScoreboardData Hook
 *
 * Fetches scoreboard data from API and provides it in v2 Scoreboard format.
 * Uses SSE for real-time push updates, with polling as fallback.
 * 
 * Refactored to use centralized scoreboardApi client with retry logic and error handling.
 *
 * Usage:
 * ```tsx
 * const scoreboard = useScoreboardData({ slug: 'tchs', enabled: true });
 *
 * <Scoreboard
 *   homeTeam={scoreboard.homeTeam}
 *   awayTeam={scoreboard.awayTeam}
 *   period={scoreboard.period}
 *   time={scoreboard.time}
 *   editable={canEdit}
 *   onScoreUpdate={scoreboard.updateScore}
 * />
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TeamData } from '@/components/v2/scoreboard/Scoreboard';
import { scoreboardApi } from '@/lib/api/scoreboard';
import { ApiError } from '@/lib/api-client';
import type { ScoreboardData as ApiScoreboardData } from '@/lib/api/scoreboard/types';

interface UseScoreboardDataOptions {
  slug: string | null;
  enabled?: boolean;
  pollInterval?: number; // milliseconds (fallback when SSE disconnects)
  viewerToken?: string | null;
  adminToken?: string | null;
  allowAnonymousEdit?: boolean;
}

interface ScoreboardData {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
  isLoading: boolean;
  error: string | null;
}

interface UseScoreboardDataReturn extends ScoreboardData {
  updateScore: (team: 'home' | 'away', newScore: number) => Promise<void>;
  refresh: () => Promise<void>;
  saveError: string | null;
}

/**
 * Apply scoreboard data from API to local state setters.
 * Also stores raw clock data for live ticking.
 */
function applyScoreboardData(
  data: ApiScoreboardData,
  setHomeTeam: React.Dispatch<React.SetStateAction<TeamData>>,
  setAwayTeam: React.Dispatch<React.SetStateAction<TeamData>>,
  setPeriod: React.Dispatch<React.SetStateAction<string | undefined>>,
  setTime: React.Dispatch<React.SetStateAction<string | undefined>>,
  setClockMode: React.Dispatch<React.SetStateAction<string | undefined>>,
  setBaseClockSeconds: React.Dispatch<React.SetStateAction<number | undefined>>,
  setClockStartedAt: React.Dispatch<React.SetStateAction<string | null | undefined>>,
  rawResponse: any, // ApiScoreboardResponse from API
) {
  setHomeTeam(data.homeTeam);
  setAwayTeam(data.awayTeam);
  setPeriod(data.period);
  setTime(data.time);
  
  // Store raw clock data for live ticking
  setClockMode(rawResponse.clockMode);
  setBaseClockSeconds(rawResponse.clockSeconds);
  setClockStartedAt(rawResponse.clockStartedAt);
}

/**
 * Hook to fetch and manage scoreboard data
 */
export function useScoreboardData({
  slug,
  enabled = true,
  pollInterval = 30000, // 30s fallback poll (SSE provides real-time)
  viewerToken,
  adminToken,
  allowAnonymousEdit = false,
}: UseScoreboardDataOptions): UseScoreboardDataReturn {
  const [homeTeam, setHomeTeam] = useState<TeamData>({
    name: 'Home',
    score: 0,
    color: '#3B82F6',
  });

  const [awayTeam, setAwayTeam] = useState<TeamData>({
    name: 'Away',
    score: 0,
    color: '#EF4444',
  });

  const [period, setPeriod] = useState<string | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sseConnectedRef = useRef(false);
  
  // Raw clock data for live ticking
  const [clockMode, setClockMode] = useState<string | undefined>(undefined);
  const [baseClockSeconds, setBaseClockSeconds] = useState<number | undefined>(undefined);
  const [clockStartedAt, setClockStartedAt] = useState<string | null | undefined>(undefined);

  /**
   * Fetch scoreboard data from API (initial load + fallback poll)
   * Now uses centralized scoreboardApi with retry logic
   */
  const fetchScoreboard = useCallback(async () => {
    if (!slug || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await scoreboardApi.fetch(slug);
      applyScoreboardData(
        data,
        setHomeTeam,
        setAwayTeam,
        setPeriod,
        setTime,
        setClockMode,
        setBaseClockSeconds,
        setClockStartedAt,
        {} // No raw response from fetch (only from SSE)
      );
    } catch (err) {
      console.error('[Scoreboard] Fetch error:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug, enabled]);

  /**
   * Update score (for editable scoreboards)
   * Now uses centralized scoreboardApi with retry logic and user-friendly errors
   */
  const updateScore = useCallback(async (team: 'home' | 'away', newScore: number) => {
    if (!slug) {
      throw new Error('No slug available');
    }
    if (!adminToken && !viewerToken && !allowAnonymousEdit) {
      throw new Error('Authentication required to update score');
    }

    try {
      const data = await scoreboardApi.updateScore(slug, team, newScore, {
        viewerToken: viewerToken || undefined,
        adminToken: adminToken || undefined,
      });

      // Clear any previous save error on success
      setSaveError(null);

      // Update local state optimistically
      if (team === 'home') {
        setHomeTeam(prev => ({ ...prev, score: newScore }));
      } else {
        setAwayTeam(prev => ({ ...prev, score: newScore }));
      }

      // SSE will push the server-confirmed value; no need for explicit refresh
      // If SSE is disconnected, the fallback poll will catch it
    } catch (err) {
      console.error('[Scoreboard] Update error:', err);
      const errorMessage = err instanceof ApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Score update failed';
      setSaveError(errorMessage);
      throw err;
    }
  }, [slug, viewerToken, adminToken, allowAnonymousEdit]);

  /**
   * SSE subscription for real-time scoreboard push
   * Now uses scoreboardApi.streamUpdates() with disconnect/reconnect callbacks
   */
  useEffect(() => {
    if (!enabled || !slug) return;

    const cleanup = scoreboardApi.streamUpdates(
      slug,
      (data, rawResponse) => {
        applyScoreboardData(
          data,
          setHomeTeam,
          setAwayTeam,
          setPeriod,
          setTime,
          setClockMode,
          setBaseClockSeconds,
          setClockStartedAt,
          rawResponse
        );
      },
      {
        onDisconnect: () => {
          sseConnectedRef.current = false;
        },
        onReconnect: () => {
          sseConnectedRef.current = true;
        },
      }
    );

    return () => {
      sseConnectedRef.current = false;
      cleanup();
    };
  }, [enabled, slug]);

  /**
   * Live clock tick effect
   * Updates displayed time every 1s when clockMode === 'running'
   */
  useEffect(() => {
    if (clockMode !== 'running' || baseClockSeconds === undefined || !clockStartedAt) {
      return;
    }

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - new Date(clockStartedAt).getTime();
      const totalSeconds = baseClockSeconds + Math.floor(elapsedMs / 1000);
      
      // Format as MM:SS
      const absSeconds = Math.abs(totalSeconds);
      const minutes = Math.floor(absSeconds / 60);
      const secs = absSeconds % 60;
      const sign = totalSeconds < 0 ? '-' : '';
      const formattedTime = `${sign}${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      
      setTime(formattedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [clockMode, baseClockSeconds, clockStartedAt]);

  /**
   * Initial fetch + fallback polling (only when SSE is disconnected)
   */
  useEffect(() => {
    if (!enabled || !slug) return;

    // Always do an initial fetch for immediate data
    fetchScoreboard();

    // Fallback poll — only fires if SSE drops
    const interval = setInterval(() => {
      if (!sseConnectedRef.current) {
        fetchScoreboard();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchScoreboard, pollInterval, enabled, slug]);

  return {
    homeTeam,
    awayTeam,
    period,
    time,
    isLoading,
    error,
    saveError,
    updateScore,
    refresh: fetchScoreboard,
  };
}
