/**
 * PlaywrightVeoDiagnosticsScraper tests (TDD — RED phase).
 * Uses HTML fixture to test table parsing; session/page mocked.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PlaywrightVeoDiagnosticsScraper } from '../implementations/PlaywrightVeoDiagnosticsScraper';
import type { VeoSession } from '../interfaces';

const FIXTURE_HTML = readFileSync(
  join(__dirname, 'fixtures', 'diagnostics-table.html'),
  'utf-8'
);

describe('PlaywrightVeoDiagnosticsScraper', () => {
  it('should extract match name, status, stream URL, upload speed, and firmware from table rows', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      content: vi.fn().mockResolvedValue(FIXTURE_HTML),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const session: VeoSession = { context: mockContext };

    const scraper = new PlaywrightVeoDiagnosticsScraper();
    const rows = await scraper.scrape(
      session,
      'https://app.veo.co/clubs/foo/live/streaming-diagnostics'
    );

    expect(rows).toHaveLength(3);

    expect(rows[0].matchName).toContain('Timber Creek High School vs Byron Nelson Varsity');
    expect(rows[0].status).toBe('Live');
    expect(rows[0].streamUrl).toContain('https://stream.mux.com/');
    expect(rows[0].uploadSpeed).toBeCloseTo(3.9164);
    expect(rows[0].firmware).toBe('3.8.8');

    expect(rows[1].matchName).toContain('Other Match');
    expect(rows[1].status).toBe('Finished');
    expect(rows[1].streamUrl).toContain('https://stream.mux.com/');
    expect(rows[1].uploadSpeed).toBeCloseTo(5.2);
    expect(rows[1].firmware).toBe('3.8.9');

    expect(rows[2].matchName).toContain('No stream link match');
    expect(rows[2].streamUrl).toBeNull();
  });

  it('should navigate to the given diagnostics URL', async () => {
    const url = 'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      content: vi.fn().mockResolvedValue('<html><body><table><tbody></tbody></table></body></html>'),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const session: VeoSession = { context: mockContext };

    const scraper = new PlaywrightVeoDiagnosticsScraper();
    await scraper.scrape(session, url);

    expect(mockContext.newPage).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(url, expect.any(Object));
    expect(mockPage.content).toHaveBeenCalled();
  });

  it('should return empty array when table has no tbody rows', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      content: vi.fn().mockResolvedValue(
        '<html><body><table><thead><tr><th>Match</th></tr></thead><tbody></tbody></table></body></html>'
      ),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const session: VeoSession = { context: mockContext };

    const scraper = new PlaywrightVeoDiagnosticsScraper();
    const rows = await scraper.scrape(session, 'https://example.com');

    expect(rows).toEqual([]);
  });
});
