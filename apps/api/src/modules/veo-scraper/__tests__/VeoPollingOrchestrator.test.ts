/**
 * VeoPollingOrchestrator tests (TDD).
 * Session reuse, auto-stop after maxDuration, re-login on failure, stopOnFirstMatch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VeoPollingOrchestrator } from '../VeoPollingOrchestrator';
import type {
  IVeoAuthenticator,
  IVeoDiagnosticsScraper,
  IVeoStreamMatcher,
  IVeoStreamUpdater,
  IVeoCandidateReader,
  VeoSession,
  VeoMatchRow,
  MatchCandidate,
  PollingConfig,
} from '../interfaces';

const session: VeoSession = { context: {} };
const credentials = { email: 'u@v.co', password: 'p' };
const config: PollingConfig = {
  credentials,
  diagnosticsUrl: 'https://app.veo.co/clubs/foo/diagnostics',
  ownerAccountId: 'owner-1',
  intervalMs: 60_000,
  maxDurationMs: 120_000,
  stopOnFirstMatch: true,
};

const emptyRows: VeoMatchRow[] = [];
const emptyCandidates: MatchCandidate[] = [];

describe('VeoPollingOrchestrator', () => {
  let mockAuth: IVeoAuthenticator;
  let mockScraper: IVeoDiagnosticsScraper;
  let mockMatcher: IVeoStreamMatcher;
  let mockUpdater: IVeoStreamUpdater;
  let mockCandidateReader: IVeoCandidateReader;

  beforeEach(() => {
    vi.useFakeTimers();
    mockAuth = {
      login: vi.fn().mockResolvedValue(session),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    mockScraper = {
      scrape: vi.fn().mockResolvedValue(emptyRows),
    };
    mockMatcher = {
      match: vi.fn().mockResolvedValue([]),
    };
    mockUpdater = {
      updateStreamUrls: vi.fn().mockResolvedValue({
        updated: 0,
        skipped: 0,
        details: [],
      }),
    };
    mockCandidateReader = {
      getCandidates: vi.fn().mockResolvedValue(emptyCandidates),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createPoller(): VeoPollingOrchestrator {
    return new VeoPollingOrchestrator(
      mockAuth,
      mockScraper,
      mockMatcher,
      mockUpdater,
      mockCandidateReader
    );
  }

  describe('start and pollOnce', () => {
    it('calls login exactly once when start then pollOnce twice', async () => {
      const poller = createPoller();
      await poller.start(config);
      expect(mockAuth.login).toHaveBeenCalledTimes(1);
      expect(mockAuth.login).toHaveBeenCalledWith(credentials);

      await poller.pollOnce();
      await poller.pollOnce();
      expect(mockAuth.login).toHaveBeenCalledTimes(1);
      expect(mockScraper.scrape).toHaveBeenCalledTimes(2);
      expect(mockScraper.scrape).toHaveBeenCalledWith(session, config.diagnosticsUrl);

      await poller.stop();
      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    });

    it('reuses session in pollOnce without logging in again', async () => {
      const poller = createPoller();
      await poller.start(config);
      vi.clearAllMocks();
      await poller.pollOnce();
      expect(mockAuth.login).not.toHaveBeenCalled();
      expect(mockScraper.scrape).toHaveBeenCalledWith(session, config.diagnosticsUrl);
      await poller.stop();
    });
  });

  describe('stopOnFirstMatch', () => {
    it('stops polling when update returns updated > 0 and stopOnFirstMatch is true', async () => {
      mockUpdater.updateStreamUrls = vi.fn().mockResolvedValue({
        updated: 1,
        skipped: 0,
        details: [{ eventSlug: 'e1', oldUrl: null, newUrl: 'https://stream.mux.com/x', confidence: 0.9 }],
      });

      const poller = createPoller();
      await poller.start(config);
      expect(mockAuth.login).toHaveBeenCalledTimes(1);

      const result = await poller.pollOnce();
      expect(result.updated).toBe(1);
      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
      expect(mockAuth.logout).toHaveBeenCalledWith(session);
    });

    it('does not stop when updated is 0 and stopOnFirstMatch is true', async () => {
      const poller = createPoller();
      await poller.start(config);
      await poller.pollOnce();
      expect(mockAuth.logout).not.toHaveBeenCalled();
      await poller.stop();
    });
  });

  describe('maxDurationMs', () => {
    it('stops automatically after maxDurationMs has elapsed', async () => {
      const poller = createPoller();
      await poller.start({ ...config, maxDurationMs: 100 });
      expect(mockAuth.login).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(150);
      await vi.runAllTimersAsync();
      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('re-login on scrape failure', () => {
    it('attempts re-login once when scrape throws', async () => {
      vi.mocked(mockScraper.scrape)
        .mockRejectedValueOnce(new Error('Session expired'))
        .mockResolvedValueOnce(emptyRows);

      const poller = createPoller();
      await poller.start(config);
      expect(mockAuth.login).toHaveBeenCalledTimes(1);

      await poller.pollOnce();
      expect(mockAuth.login).toHaveBeenCalledTimes(2);
      expect(mockScraper.scrape).toHaveBeenCalledTimes(2);
      await poller.stop();
    });
  });

  describe('stop', () => {
    it('clears interval and calls logout; no further polls after stop', async () => {
      const poller = createPoller();
      await poller.start(config);
      await poller.stop();
      expect(mockAuth.logout).toHaveBeenCalledWith(session);
      vi.advanceTimersByTime(120_000);
      await vi.runAllTimersAsync();
      expect(mockScraper.scrape).toHaveBeenCalledTimes(0);
    });
  });
});
