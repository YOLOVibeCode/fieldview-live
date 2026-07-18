/**
 * Gemini API client for Veo scraper: extract structured table data from HTML when DOM parsing fails.
 * Uses GEMINI_API_KEY from env only (never hardcoded).
 */

import { logger } from '../../../lib/logger';
import type { VeoMatchRow } from '../interfaces';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MAX_HTML_CHARS = 120_000;

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

/** Strip scripts and large attributes to reduce tokens; keep table structure. */
export function sanitizeHtmlForGemini(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sclass="[^"]*"/gi, '')
    .slice(0, MAX_HTML_CHARS);
}

const EXTRACT_PROMPT = `You are given HTML from a "Stream Diagnostics" page. It contains a table of matches with columns like Match (event name + date/time), Firmware, Camera, Connection, Disconnects, Upload Speed (Mb/s), Until Archived, Status (e.g. Live or Finished), and a column with links to stream.mux.com.

Extract every table row into a JSON array. For each row return exactly:
- matchName: string (full text of the Match column, e.g. "Timber Creek High School vs Byron Nelson Varsity 24/02/2026 - 18:17")
- status: string (e.g. "Live", "Finished", "Archived")
- streamUrl: string or null (the full https://stream.mux.com/... URL from the link column, or null if missing)
- uploadSpeed: number or null (Upload Speed value, or null)
- firmware: string (Firmware column text, or "")

Return ONLY a single JSON array of objects, no markdown or explanation. Example:
[{"matchName":"Team A vs Team B 24/02/2026","status":"Live","streamUrl":"https://stream.mux.com/abc123","uploadSpeed":5.2,"firmware":"3.8.8"},...]`;

export interface GeminiExtractResult {
  rows: VeoMatchRow[];
  usedGemini: boolean;
}

/**
 * Call Gemini to extract diagnostics table rows from HTML. Returns empty array on missing key or API error.
 */
export async function extractDiagnosticsTableWithGemini(html: string): Promise<GeminiExtractResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { rows: [], usedGemini: false };
  }

  const sanitized = sanitizeHtmlForGemini(html);
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACT_PROMPT },
          { text: '\n\nHTML:\n' + sanitized },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return { rows: [], usedGemini: true };
    }

    const parsed = JSON.parse(text) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [];
    const rows: VeoMatchRow[] = arr
      .filter((o): o is Record<string, unknown> => o != null && typeof o === 'object')
      .map((o) => ({
        matchName: String(o.matchName ?? '').trim(),
        status: String(o.status ?? '').trim(),
        streamUrl: typeof o.streamUrl === 'string' && o.streamUrl ? o.streamUrl : null,
        uploadSpeed:
          typeof o.uploadSpeed === 'number' && !Number.isNaN(o.uploadSpeed)
            ? o.uploadSpeed
            : null,
        firmware: String(o.firmware ?? '').trim(),
      }));

    return { rows, usedGemini: true };
  } catch (err) {
    logger.warn({ err }, 'Veo scraper: Gemini extract failed');
    return { rows: [], usedGemini: true };
  }
}
