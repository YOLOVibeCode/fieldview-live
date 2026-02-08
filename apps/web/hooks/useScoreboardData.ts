/**
 * useScoreboardData Hook
 * 
 * Fetches scoreboard data from API and provides it in v2 Scoreboard format.
 * Handles real-time updates via polling.
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

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TeamData } from '@/components/v2/scoreboard/Scoreboard';

interface UseScoreboardDataOptions {
  slug: string | null;
  enabled?: boolean;
  pollInterval?: number; // milliseconds
  viewerToken?: string | null;
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
}

interface ApiScoreboardResponse {
  homeTeam: {
    name: string;
    abbreviation?: string;
    score: number;
    color?: string;
  };
  awayTeam: {
    name: string;
    abbreviation?: string;
    score: number;
    color?: string;
  };
  period?: string;
  time?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

/**
 * Default team colors (cinema theme)
 */
const DEFAULT_HOME_COLOR = '#3B82F6'; // Blue
const DEFAULT_AWAY_COLOR = '#EF4444'; // Red

/**
 * Hook to fetch and manage scoreboard data
 */
export function useScoreboardData({
  slug,
  enabled = true,
  pollInterval = 5000, // 5 seconds default
  viewerToken,
  allowAnonymousEdit = false,
}: UseScoreboardDataOptions): UseScoreboardDataReturn {
  const [homeTeam, setHomeTeam] = useState<TeamData>({
    name: 'Home',
    score: 0,
    color: DEFAULT_HOME_COLOR,
  });
  
  const [awayTeam, setAwayTeam] = useState<TeamData>({
    name: 'Away',
    score: 0,
    color: DEFAULT_AWAY_COLOR,
  });
  
  const [period, setPeriod] = useState<string | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch scoreboard data from API
   */
  const fetchScoreboard = useCallback(async () => {
    if (!slug || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/public/scoreboard/${slug}`, {
        headers: viewerToken
          ? { Authorization: `Bearer ${viewerToken}` }
          : {},
      });

      if (!response.ok) {
        // If scoreboard doesn't exist (404), that's OK - use defaults, don't set error
        if (response.status === 404) {
          console.log(`[Scoreboard] No data for ${slug}, using defaults`);
          setError(null); // Explicitly clear error for 404
          return;
        }
        // Only set error for actual errors (5xx), not missing data
        if (response.status >= 500) {
          throw new Error(`Failed to fetch scoreboard: ${response.statusText}`);
        }
        // For other non-OK statuses (like 403), don't show error either
        console.log(`[Scoreboard] Non-critical response ${response.status} for ${slug}, using defaults`);
        setError(null);
        return;
      }

      const data: ApiScoreboardResponse = await response.json();

      setHomeTeam({
        name: data.homeTeam.name,
        abbreviation: data.homeTeam.abbreviation,
        score: data.homeTeam.score,
        color: data.homeTeam.color || DEFAULT_HOME_COLOR,
      });

      setAwayTeam({
        name: data.awayTeam.name,
        abbreviation: data.awayTeam.abbreviation,
        score: data.awayTeam.score,
        color: data.awayTeam.color || DEFAULT_AWAY_COLOR,
      });

      setPeriod(data.period);
      setTime(data.time);
    } catch (err) {
      console.error('[Scoreboard] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [slug, enabled, viewerToken]);

  /**
   * Update score (for editable scoreboards)
   */
  const updateScore = useCallback(async (team: 'home' | 'away', newScore: number) => {
    if (!slug) {
      throw new Error('No slug available');
    }
    if (!viewerToken && !allowAnonymousEdit) {
      throw new Error('Authentication required to update score');
    }

    try {
      const field = team === 'home' ? 'homeScore' : 'awayScore';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (viewerToken) {
        headers.Authorization = `Bearer ${viewerToken}`;
      }

      const response = await fetch(`${API_URL}/api/direct/${encodeURIComponent(slug)}/scoreboard/viewer-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          viewerToken: viewerToken || undefined,
          field,
          value: newScore,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update score: ${response.statusText}`);
      }

      // Update local state optimistically
      if (team === 'home') {
        setHomeTeam(prev => ({ ...prev, score: newScore }));
      } else {
        setAwayTeam(prev => ({ ...prev, score: newScore }));
      }

      // Refresh from server to ensure consistency
      await fetchScoreboard();
    } catch (err) {
      console.error('[Scoreboard] Update error:', err);
      throw err;
    }
  }, [slug, viewerToken, allowAnonymousEdit, fetchScoreboard]);

  /**
   * Initial fetch and polling
   */
  useEffect(() => {
    if (!enabled || !slug) return;

    // Initial fetch
    fetchScoreboard();

    // Poll for updates
    const interval = setInterval(fetchScoreboard, pollInterval);

    return () => clearInterval(interval);
  }, [fetchScoreboard, pollInterval, enabled, slug]);

  return {
    homeTeam,
    awayTeam,
    period,
    time,
    isLoading,
    error,
    updateScore,
    refresh: fetchScoreboard,
  };
}

