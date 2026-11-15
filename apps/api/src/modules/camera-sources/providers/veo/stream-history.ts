/**
 * Pure helpers for Veo's stream-history API:
 *   GET /api/v2/live/stream-history/clubs/<club>/stream-history
 * Each entry's `additional_info.broadcast_link` is the
 * `https://stream.mux.com/<id>.m3u8` URL we hand to FieldView.
 */

import type { VeoMatchRow } from './types';

interface StreamHistoryEntry {
  firmware_version?: string;
  /** Epoch milliseconds. */
  creation_time?: number;
  additional_info?: {
    home_team?: string;
    away_team?: string;
    status?: string;
    broadcast_link?: string;
    average_upload_speed?: number;
    is_external?: boolean;
  };
}

export interface StreamHistoryResponse {
  result?: StreamHistoryEntry[];
}

/** Map a stream-history JSON payload to VeoMatchRow[] (faithful — all entries). */
export function mapStreamHistoryToRows(data: StreamHistoryResponse | null): VeoMatchRow[] {
  const results = Array.isArray(data?.result) ? data.result : [];
  return results.map((entry) => {
    const info = entry.additional_info ?? {};
    const home = (info.home_team ?? '').trim();
    const away = (info.away_team ?? '').trim();
    const matchName = away ? `${home} vs ${away}` : home;
    const speed = typeof info.average_upload_speed === 'number' ? info.average_upload_speed : null;
    return {
      matchName,
      status: info.status ?? '',
      streamUrl: info.broadcast_link ?? null,
      uploadSpeed: Number.isNaN(speed as number) ? null : speed,
      firmware: entry.firmware_version ?? '',
      createdAtMs: typeof entry.creation_time === 'number' && entry.creation_time > 0 ? entry.creation_time : null,
    };
  });
}

/**
 * Veo's broadcast statuses, as its own live tab defines them (read from Veo's
 * public web app, 2026-11-15): unstarted | live | disconnected | finished | external.
 */
export const VEO_FINISHED_STATUS = 'finished';

/** A broadcast older than this is not "the game happening now", whatever its status says. */
export const MAX_LIVE_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * A row is a candidate only if it is not finished, has a playable URL, and was
 * created recently. Not-finished covers `live`, a camera that briefly
 * `disconnected`, and an `unstarted` broadcast about to begin. The age limit
 * stops a broadcast that never reached `finished` from being linked to a game
 * days later. Rows with no creation time are not age-limited.
 */
export function isLiveRow(row: VeoMatchRow, opts?: { nowMs?: number }): boolean {
  if (row.status === VEO_FINISHED_STATUS || !row.streamUrl) return false;
  if (row.createdAtMs == null) return true;
  const nowMs = opts?.nowMs ?? Date.now();
  return nowMs - row.createdAtMs <= MAX_LIVE_AGE_MS;
}
