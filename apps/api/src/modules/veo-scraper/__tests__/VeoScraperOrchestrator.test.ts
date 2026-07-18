/**
 * VeoScraperOrchestrator tests (TDD — RED phase).
 * All dependencies mocked via ISP interfaces.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VeoScraperOrchestrator } from '../VeoScraperOrchestrator';
import type {
  IVeoAuthenticator,
  IVeoDiagnosticsScraper,
  IVeoStreamMatcher,
  IVeoStreamUpdater,
  IVeoCandidateReader,
  VeoCredentials,
  VeoSession,
  VeoMatchRow,
  MatchCandidate,
  StreamMatch,
  ScraperConfig,
} from '../interfaces';

describe('VeoScraperOrchestrator', () => {
  let mockAuth: IVeoAuthenticator;
  let mockScraper: IVeoDiagnosticsScraper;
  let mockMatcher: IVeoStreamMatcher;
  let mockUpdater: IVeoStreamUpdater;
  let mockCandidateReader: IVeoCandidateReader;

  const credentials: VeoCredentials = {
    email: 'test@example.com',
    password: 'secret',
  };

  const session: VeoSession = { context: {} };

  const config: ScraperConfig = {
    credentials,
    diagnosticsUrl: 'https://app.veo.co/clubs/foo/live/streaming-diagnostics',
    ownerAccountId: 'owner-123',
    minConfidence: 0.7,
  };

  const sampleRows: VeoMatchRow[] = [
    {
      matchName: 'Timber Creek vs Byron Nelson Varsity',
      status: 'Live',
      streamUrl: 'https://stream.mux.com/abc123',
      uploadSpeed: 5.2,
      firmware: '1.0',
    },
  ];

  const sampleCandidates: MatchCandidate[] = [
    {
      eventId: 'ev-1',
      eventSlug: 'soccer-varsity',
      title: 'Timber Creek vs Byron Nelson Varsity',
      directStreamSlug: 'tchs',
      currentStreamUrl: null,
    },
  ];

  const sampleMatches: StreamMatch[] = [
    {
      veoRow: sampleRows[0],
      event: sampleCandidates[0],
      confidence: 0.95,
    },
  ];

  beforeEach(() => {
    mockAuth = {
      login: vi.fn().mockResolvedValue(session),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    mockScraper = {
      scrape: vi.fn().mockResolvedValue(sampleRows),
    };
    mockMatcher = {
      match: vi.fn().mockResolvedValue(sampleMatches),
    };
    mockUpdater = {
      updateStreamUrls: vi.fn().mockResolvedValue({
        updated: 1,
        skipped: 0,
        details: [
          {
            eventSlug: 'soccer-varsity',
            oldUrl: null,
            newUrl: 'https://stream.mux.com/abc123',
            confidence: 0.95,
          },
        ],
      }),
    };
    mockCandidateReader = {
      getCandidates: vi.fn().mockResolvedValue(sampleCandidates),
    };
  });

  function createOrchestrator(): VeoScraperOrchestrator {
    return new VeoScraperOrchestrator(
      mockAuth,
      mockScraper,
      mockMatcher,
      mockUpdater,
      mockCandidateReader
    );
  }

  describe('run', () => {
    it('should login, scrape, match, filter by confidence, update, and logout', async () => {
      const orchestrator = createOrchestrator();
      const result = await orchestrator.run(config);

      expect(mockAuth.login).toHaveBeenCalledWith(credentials);
      expect(mockCandidateReader.getCandidates).toHaveBeenCalledWith(
        config.ownerAccountId
      );
      expect(mockScraper.scrape).toHaveBeenCalledWith(
        session,
        config.diagnosticsUrl
      );
      expect(mockMatcher.match).toHaveBeenCalledWith(
        sampleRows,
        sampleCandidates
      );
      expect(mockUpdater.updateStreamUrls).toHaveBeenCalledWith(sampleMatches);
      expect(mockAuth.logout).toHaveBeenCalledWith(session);

      expect(result.scraped).toBe(1);
      expect(result.matched).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.details).toHaveLength(1);
    });

    it('should filter out matches below minConfidence', async () => {
      const lowConfidenceMatches: StreamMatch[] = [
        {
          veoRow: sampleRows[0],
          event: sampleCandidates[0],
          confidence: 0.5,
        },
      ];
      vi.mocked(mockMatcher.match).mockResolvedValue(lowConfidenceMatches);

      const orchestrator = createOrchestrator();
      await orchestrator.run(config);

      expect(mockUpdater.updateStreamUrls).toHaveBeenCalledWith([]);
    });

    it('should call logout even when scrape throws', async () => {
      vi.mocked(mockScraper.scrape).mockRejectedValue(new Error('Scrape failed'));

      const orchestrator = createOrchestrator();
      await expect(orchestrator.run(config)).rejects.toThrow('Scrape failed');
      expect(mockAuth.logout).toHaveBeenCalledWith(session);
    });

    it('should use default minConfidence of 0.7 when not provided', async () => {
      const matchesAt07: StreamMatch[] = [
        {
          veoRow: sampleRows[0],
          event: sampleCandidates[0],
          confidence: 0.7,
        },
      ];
      vi.mocked(mockMatcher.match).mockResolvedValue(matchesAt07);

      const orchestrator = createOrchestrator();
      await orchestrator.run({
        ...config,
        minConfidence: undefined,
      });

      expect(mockUpdater.updateStreamUrls).toHaveBeenCalledWith(matchesAt07);
    });

    it('should return scraped count 0 when scraper returns empty rows', async () => {
      vi.mocked(mockScraper.scrape).mockResolvedValue([]);
      vi.mocked(mockMatcher.match).mockResolvedValue([]);

      const orchestrator = createOrchestrator();
      const result = await orchestrator.run(config);

      expect(result.scraped).toBe(0);
      expect(result.matched).toBe(0);
      expect(mockUpdater.updateStreamUrls).toHaveBeenCalledWith([]);
    });
  });
});
