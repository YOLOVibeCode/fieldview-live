/**
 * Veo live-stream scraper (JSON API).
 *
 * The Veo diagnostics page is a client-rendered SPA, so parsing its HTML is
 * unreliable. Instead we let the SPA make its own authenticated call to
 *   GET /api/v2/live/stream-history/clubs/<club>/stream-history
 * and capture that response. Each entry's `additional_info.broadcast_link` is the
 * `https://stream.mux.com/<id>.m3u8` URL we hand to FieldView.
 *
 * Replaying the call directly (context.request) returns 401 — the app uses a
 * per-request token — so capturing the SPA's own response is the robust path.
 */

import { logger } from '../../../lib/logger';
import type { IVeoDiagnosticsScraper, VeoSession, VeoMatchRow } from '../interfaces';

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
  const results = Array.isArray(data?.result) ? (data as StreamHistoryResponse).result! : [];
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

const STREAM_HISTORY_RE = /\/api\/v2\/live\/stream-history\//;

/** Derive the club "live" page URL from the stored diagnostics URL. */
function deriveLiveUrl(diagnosticsUrl: string): string {
  return diagnosticsUrl.replace(/\/streaming-diagnostics\/?$/, '');
}

function extractClubSlug(url: string): string | null {
  const match = url.match(/\/clubs\/([^/]+)/);
  return match ? match[1] : null;
}

type MinimalPage = {
  goto(url: string, options?: { waitUntil?: string }): Promise<unknown>;
  waitForLoadState?(state: string, options?: { timeout?: number }): Promise<unknown>;
};
type MinimalContext = {
  newPage(): Promise<MinimalPage>;
  on(event: 'response', handler: (response: MinimalResponse) => void): void;
  off?(event: 'response', handler: (response: MinimalResponse) => void): void;
};
type MinimalResponse = {
  url(): string;
  ok(): boolean;
  json(): Promise<unknown>;
};

export class PlaywrightVeoLiveApiScraper implements IVeoDiagnosticsScraper {
  async scrape(session: VeoSession, diagnosticsUrl: string): Promise<VeoMatchRow[]> {
    const context = session.context as MinimalContext;
    const clubSlug = extractClubSlug(diagnosticsUrl);

    let captured: StreamHistoryResponse | null = null;
    const onResponse = (response: MinimalResponse): void => {
      void (async () => {
        try {
          const url = response.url();
          if (
            !captured &&
            STREAM_HISTORY_RE.test(url) &&
            (!clubSlug || url.includes(`/clubs/${clubSlug}/`)) &&
            response.ok()
          ) {
            captured = (await response.json().catch(() => null)) as StreamHistoryResponse | null;
          }
        } catch {
          // ignore body-read races
        }
      })();
    };
    context.on('response', onResponse);

    try {
      const page = await context.newPage();
      // Navigating to the club's live view triggers the SPA's authenticated
      // stream-history fetch, which onResponse captures.
      const liveUrl = deriveLiveUrl(diagnosticsUrl);
      await page.goto(liveUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState?.('networkidle', { timeout: 15000 }).catch(() => {});
      // Fallback: the diagnostics URL also triggers the fetch.
      if (!captured) {
        await page.goto(diagnosticsUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState?.('networkidle', { timeout: 15000 }).catch(() => {});
      }
    } finally {
      context.off?.('response', onResponse);
    }

    if (!captured) {
      logger.warn({ diagnosticsUrl }, 'Veo live API scraper: stream-history not captured');
      return [];
    }

    const liveRows = mapStreamHistoryToRows(captured).filter(isLiveRow);
    logger.info({ count: liveRows.length }, 'Veo live API scraper: captured live streams');
    return liveRows;
  }
}
