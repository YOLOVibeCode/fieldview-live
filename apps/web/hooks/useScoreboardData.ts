/**
 * useScoreboardData Hook
 *
 * Fetches scoreboard data from API and provides it in v2 Scoreboard format.
 * Uses SSE for real-time push updates, with polling as fallback.
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

interface UseScoreboardDataOptions {
  slug: string | null;
  enabled?: boolean;
  pollInterval?: number; // milliseconds (fallback when SSE disconnects)
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
  homeTeamName: string;
  awayTeamName: string;
  homeJerseyColor: string;
  awayJerseyColor: string;
  homeScore: number;
  awayScore: number;
  clockMode: string;
  clockSeconds: number;
  clockStartedAt: string | null;
  lastEditedBy: string | null;
  lastEditedAt: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

/**
 * Default team colors (cinema theme)
 */
const DEFAULT_HOME_COLOR = '#3B82F6'; // Blue
const DEFAULT_AWAY_COLOR = '#EF4444'; // Red

/**
 * Apply a scoreboard data payload to the local state setters.
 */
function applyScoreboardData(
  data: ApiScoreboardResponse,
  setHomeTeam: React.Dispatch<React.SetStateAction<TeamData>>,
  setAwayTeam: React.Dispatch<React.SetStateAction<TeamData>>,
  setTime: React.Dispatch<React.SetStateAction<string | undefined>>,
) {
  setHomeTeam(prev => ({
    ...prev,
    name: data.homeTeamName || prev.name,
    score: data.homeScore ?? prev.score,
    color: data.homeJerseyColor || prev.color,
  }));

  setAwayTeam(prev => ({
    ...prev,
    name: data.awayTeamName || prev.name,
    score: data.awayScore ?? prev.score,
    color: data.awayJerseyColor || prev.color,
  }));

  if (data.clockMode === 'running' || data.clockSeconds > 0) {
    const mins = Math.floor(data.clockSeconds / 60);
    const secs = data.clockSeconds % 60;
    setTime(`${mins}:${secs.toString().padStart(2, '0')}`);
  }
}

/**
 * Hook to fetch and manage scoreboard data
 */
export function useScoreboardData({
  slug,
  enabled = true,
  pollInterval = 30000, // 30s fallback poll (SSE provides real-time)
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
  const sseConnectedRef = useRef(false);

  /**
   * Fetch scoreboard data from API (initial load + fallback poll)
   */
  const fetchScoreboard = useCallback(async () => {
    if (!slug || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/direct/${encodeURIComponent(slug)}/scoreboard`, {
        headers: viewerToken
          ? { Authorization: `Bearer ${viewerToken}` }
          : {},
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[Scoreboard] No data for ${slug}, using defaults`);
          setError(null);
          return;
        }
        if (response.status >= 500) {
          throw new Error(`Failed to fetch scoreboard: ${response.statusText}`);
        }
        console.log(`[Scoreboard] Non-critical response ${response.status} for ${slug}, using defaults`);
        setError(null);
        return;
      }

      const data: ApiScoreboardResponse = await response.json();
      applyScoreboardData(data, setHomeTeam, setAwayTeam, setTime);
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

      // SSE will push the server-confirmed value; no need for explicit refresh
      // If SSE is disconnected, the fallback poll will catch it
    } catch (err) {
      console.error('[Scoreboard] Update error:', err);
      throw err;
    }
  }, [slug, viewerToken, allowAnonymousEdit]);

  /**
   * SSE subscription for real-time scoreboard push
   */
  useEffect(() => {
    if (!enabled || !slug) return;

    const sseUrl = `${API_URL}/api/direct/${encodeURIComponent(slug)}/scoreboard/stream`;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(sseUrl);

      es.addEventListener('scoreboard_snapshot', (event) => {
        try {
          const data: ApiScoreboardResponse = JSON.parse(event.data);
          applyScoreboardData(data, setHomeTeam, setAwayTeam, setTime);
          sseConnectedRef.current = true;
        } catch (err) {
          console.error('[Scoreboard SSE] snapshot parse error:', err);
        }
      });

      es.addEventListener('scoreboard_update', (event) => {
        try {
          const data: ApiScoreboardResponse = JSON.parse(event.data);
          applyScoreboardData(data, setHomeTeam, setAwayTeam, setTime);
        } catch (err) {
          console.error('[Scoreboard SSE] update parse error:', err);
        }
      });

      es.onerror = () => {
        sseConnectedRef.current = false;
        es?.close();
        // Reconnect after 5s
        reconnectTimer = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      sseConnectedRef.current = false;
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [enabled, slug]);

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
    updateScore,
    refresh: fetchScoreboard,
  };
}
