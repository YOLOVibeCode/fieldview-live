/**
 * Pure helpers for Veo's stream-history API:
 *   GET /api/v2/live/stream-history/clubs/<club>/stream-history
 * Each entry's `additional_info.broadcast_link` is the
 * `https://stream.mux.com/<id>.m3u8` URL we hand to FieldView.
 */

import type { VeoMatchRow } from './types';

interface StreamHistoryEntry {
  firmware_version?: string;
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
    };
  });
}

/**
 * A row is a candidate for ingestion only if it is currently streaming (not
 * "finished") AND has a playable URL. This prevents matching a scheduled event
 * to an OLD finished stream with the same team names and writing a stale VOD URL.
 *
 * NOTE: "finished" is the only status observed so far (all past streams). The
 * exact live-status value is unconfirmed until a live capture; excluding
 * "finished" is safe because any live/active value passes through.
 */
export function isLiveRow(row: VeoMatchRow): boolean {
  return row.status !== 'finished' && !!row.streamUrl;
}
