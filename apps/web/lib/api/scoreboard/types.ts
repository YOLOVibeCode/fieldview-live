/**
 * Scoreboard API Types
 * 
 * ISP (Interface Segregation Principle) - Segregated interfaces with max 5-7 methods each
 */

import type { ApiError } from '@/lib/api-client';

// Scoreboard Data Types
export interface ScoreboardData {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
}

export interface TeamData {
  name: string;
  score: number;
  color: string;
}

export interface ApiScoreboardResponse {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeJerseyColor: string;
  awayJerseyColor: string;
  clockMode?: string;
  clockSeconds?: number;
  clockStartedAt?: string | null;
  isVisible?: boolean;
  position?: string;
  lastEditedBy?: string | null;
  lastEditedAt?: string | null;
}

// ISP: Separate read operations (2 methods)
export interface IScoreboardReader {
  fetch(slug: string): Promise<ScoreboardData>;
  streamUpdates(
    slug: string,
    onUpdate: (data: ScoreboardData, rawResponse: ApiScoreboardResponse) => void,
    callbacks?: {
      onDisconnect?: () => void;
      onReconnect?: () => void;
    }
  ): () => void;
}

// ISP: Separate write operations (2 methods)
export interface IScoreboardWriter {
  updateScore(
    slug: string,
    team: 'home' | 'away',
    score: number,
    auth?: { viewerToken?: string; adminToken?: string }
  ): Promise<ScoreboardData>;
  updateTeamName(
    slug: string,
    team: 'home' | 'away',
    name: string,
    auth?: { viewerToken?: string; adminToken?: string }
  ): Promise<ScoreboardData>;
}

// ISP: Clock operations (3 methods)
export interface IScoreboardClockWriter {
  startClock(slug: string, auth?: { adminToken?: string }): Promise<ScoreboardData>;
  pauseClock(slug: string, auth?: { adminToken?: string }): Promise<ScoreboardData>;
  resetClock(slug: string, auth?: { adminToken?: string }): Promise<ScoreboardData>;
}

// ISP: Error handling (4 methods)
export interface IApiErrorHandler {
  isRetryable(error: ApiError): boolean;
  getUserMessage(error: ApiError): string;
  shouldLog(error: ApiError): boolean;
  getRetryDelay(attempt: number): number;
}
