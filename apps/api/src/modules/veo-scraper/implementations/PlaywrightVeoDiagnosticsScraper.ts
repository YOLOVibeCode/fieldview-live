/**
 * Scrape Veo streaming diagnostics page: navigate with Playwright, parse table with Cheerio.
 * Falls back to Gemini when the static parser returns 0 rows (e.g. different page structure).
 */

import * as cheerio from 'cheerio';
import { logger } from '../../../lib/logger';
import { extractDiagnosticsTableWithGemini } from '../lib/gemini';
import type { IVeoDiagnosticsScraper, VeoSession, VeoMatchRow } from '../interfaces';

const COL_MATCH = 0;
const COL_FIRMWARE = 1;
const COL_UPLOAD_SPEED = 5;
const COL_STATUS = 7;
const COL_LINK = 8;

function parseDiagnosticsTable(html: string): VeoMatchRow[] {
  const $ = cheerio.load(html);
  const rows: VeoMatchRow[] = [];

  $('table tbody tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length < COL_LINK + 1) return;

    const matchName = $(cells[COL_MATCH]).text().trim();
    const firmware = $(cells[COL_FIRMWARE]).text().trim();
    const status = $(cells[COL_STATUS]).text().trim();
    const uploadSpeedRaw = $(cells[COL_UPLOAD_SPEED]).text().trim();
    let uploadSpeed: number | null = uploadSpeedRaw ? parseFloat(uploadSpeedRaw) : null;
    if (uploadSpeed !== null && Number.isNaN(uploadSpeed)) uploadSpeed = null;

    const linkCell = $(cells[COL_LINK]);
    const href = linkCell.find('a[href*="stream.mux.com"]').attr('href') ?? null;
    const linkText = linkCell.text().trim();
    const streamUrl =
      href ??
      (linkText.startsWith('https://stream.mux.com') ? linkText : null);

    rows.push({
      matchName,
      status,
      streamUrl: streamUrl || null,
      uploadSpeed,
      firmware,
    });
  });

  return rows;
}

export class PlaywrightVeoDiagnosticsScraper implements IVeoDiagnosticsScraper {
  async scrape(
    session: VeoSession,
    diagnosticsUrl: string
  ): Promise<VeoMatchRow[]> {
    const context = session.context as {
      newPage(): Promise<{
        goto(url: string, options?: { waitUntil?: string }): Promise<void>;
        content(): Promise<string>;
        waitForSelector?(selector: string): Promise<unknown>;
      }>;
    };
    const page = await context.newPage();
    await page.goto(diagnosticsUrl, { waitUntil: 'domcontentloaded' });
    if (page.waitForSelector) {
      await page.waitForSelector('table tbody tr').catch(() => {});
    }
    const html = await page.content();
    const rows = parseDiagnosticsTable(html);

    if (rows.length === 0 && process.env.GEMINI_API_KEY) {
      const { rows: geminiRows, usedGemini } = await extractDiagnosticsTableWithGemini(html);
      if (usedGemini && geminiRows.length > 0) {
        logger.info({ count: geminiRows.length }, 'Veo scraper: used Gemini fallback to extract rows');
        return geminiRows;
      }
    }

    return rows;
  }
}
