import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scoreboardApi } from '../scoreboardApi';

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 0;
  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;
  private listeners: Map<string, Array<(event: any) => void>> = new Map();

  constructor(url: string) {
    this.url = url;
    this.readyState = this.CONNECTING;
    setTimeout(() => {
      this.readyState = this.OPEN;
    }, 0);
  }

  addEventListener(event: string, handler: (event: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: (event: any) => void) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  close() {
    this.readyState = this.CLOSED;
  }

  simulateMessage(data: any) {
    const handlers = this.listeners.get(data.type);
    if (handlers) {
      // Don't double-stringify - event.data should be a string representation
      const dataWithoutType = { ...data };
      delete dataWithoutType.type;
      const event = { data: JSON.stringify(dataWithoutType) } as MessageEvent;
      handlers.forEach(handler => handler(event));
    }
  }

  simulateError() {
    const handlers = this.listeners.get('error');
    if (handlers) {
      const event = new Event('error');
      handlers.forEach(handler => handler(event));
    }
  }
}

describe('ScoreboardApi SSE Reconnection', () => {
  let mockEventSources: MockEventSource[] = [];
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEventSources = [];
    
    originalEventSource = global.EventSource;
    global.EventSource = vi.fn((url: string) => {
      const mock = new MockEventSource(url);
      mockEventSources.push(mock);
      return mock as any;
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    global.EventSource = originalEventSource;
  });

  describe('Connection establishment', () => {
    it('should establish initial SSE connection', () => {
      const onUpdate = vi.fn();
      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate);

      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/direct/test-slug/scoreboard/stream')
      );
      expect(mockEventSources).toHaveLength(1);

      cleanup();
    });

    it('should call onUpdate when receiving scoreboard_snapshot', async () => {
      const onUpdate = vi.fn();
      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate);

      const mockData = {
        type: 'scoreboard_snapshot',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 10,
        awayScore: 5,
        homeJerseyColor: '#FF0000',
        awayJerseyColor: '#0000FF',
        clockMode: 'stopped',
        clockSeconds: 0,
        clockStartedAt: null,
      };

      mockEventSources[0].simulateMessage(mockData);

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          homeTeam: expect.objectContaining({ name: 'Home', score: 10 }),
          awayTeam: expect.objectContaining({ name: 'Away', score: 5 }),
        }),
        expect.objectContaining({
          homeTeamName: 'Home',
          awayTeamName: 'Away',
          homeScore: 10,
          awayScore: 5,
        })
      );

      cleanup();
    });
  });

  describe('Reconnection with exponential backoff', () => {
    it('should reconnect after first error with 1s delay', async () => {
      const onUpdate = vi.fn();
      const onDisconnect = vi.fn();
      const onReconnect = vi.fn();

      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate, {
        onDisconnect,
        onReconnect,
      });

      expect(mockEventSources).toHaveLength(1);

      // Simulate error
      mockEventSources[0].simulateError();
      expect(onDisconnect).toHaveBeenCalledTimes(1);

      // Wait for 1s backoff
      await vi.advanceTimersByTimeAsync(1000);

      // Should attempt reconnection
      expect(mockEventSources).toHaveLength(2);
      expect(global.EventSource).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it('should use exponential backoff (1s, 2s, 4s, 8s)', async () => {
      const onUpdate = vi.fn();
      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate);

      // First connection
      expect(mockEventSources).toHaveLength(1);

      // Error 1: backoff 1s
      mockEventSources[0].simulateError();
      await vi.advanceTimersByTimeAsync(999);
      expect(mockEventSources).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockEventSources).toHaveLength(2);

      // Error 2: backoff 2s
      mockEventSources[1].simulateError();
      await vi.advanceTimersByTimeAsync(1999);
      expect(mockEventSources).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockEventSources).toHaveLength(3);

      // Error 3: backoff 4s
      mockEventSources[2].simulateError();
      await vi.advanceTimersByTimeAsync(3999);
      expect(mockEventSources).toHaveLength(3);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockEventSources).toHaveLength(4);

      // Error 4: backoff 8s
      mockEventSources[3].simulateError();
      await vi.advanceTimersByTimeAsync(7999);
      expect(mockEventSources).toHaveLength(4);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockEventSources).toHaveLength(5);

      cleanup();
    });

    it('should cap backoff at 30s maximum', async () => {
      const onUpdate = vi.fn();
      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate);

      // Simulate many errors to reach max backoff
      for (let i = 0; i < 10; i++) {
        const currentCount = mockEventSources.length;
        mockEventSources[currentCount - 1].simulateError();
        
        // Calculate expected backoff (max 30s)
        const expectedBackoff = Math.min(1000 * Math.pow(2, i), 30000);
        
        await vi.advanceTimersByTimeAsync(expectedBackoff);
        
        // Should have created new connection
        expect(mockEventSources).toHaveLength(currentCount + 1);
      }

      cleanup();
    });

    it('should reset reconnect attempts on successful snapshot', async () => {
      const onUpdate = vi.fn();
      const onReconnect = vi.fn();
      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate, {
        onReconnect,
      });

      // First error: 1s backoff
      mockEventSources[0].simulateError();
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockEventSources).toHaveLength(2);

      // Second error: 2s backoff
      mockEventSources[1].simulateError();
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockEventSources).toHaveLength(3);

      // Successful snapshot - should reset attempts
      const mockData = {
        type: 'scoreboard_snapshot',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 0,
        awayScore: 0,
        homeJerseyColor: '#FF0000',
        awayJerseyColor: '#0000FF',
        clockMode: 'stopped',
        clockSeconds: 0,
        clockStartedAt: null,
      };
      mockEventSources[2].simulateMessage(mockData);
      expect(onReconnect).toHaveBeenCalled();

      // Next error should use 1s backoff again (reset)
      mockEventSources[2].simulateError();
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockEventSources).toHaveLength(4);

      cleanup();
    });
  });

  describe('Callbacks', () => {
    it('should call onDisconnect callback on error', async () => {
      const onUpdate = vi.fn();
      const onDisconnect = vi.fn();

      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate, {
        onDisconnect,
      });

      mockEventSources[0].simulateError();

      expect(onDisconnect).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('should call onReconnect callback after successful reconnection', async () => {
      const onUpdate = vi.fn();
      const onReconnect = vi.fn();

      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate, {
        onReconnect,
      });

      // Trigger error
      mockEventSources[0].simulateError();
      await vi.advanceTimersByTimeAsync(1000);

      // Should have reconnected
      expect(mockEventSources).toHaveLength(2);

      // Receive snapshot on new connection
      const mockData = {
        type: 'scoreboard_snapshot',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 0,
        awayScore: 0,
        homeJerseyColor: '#FF0000',
        awayJerseyColor: '#0000FF',
        clockMode: 'stopped',
        clockSeconds: 0,
        clockStartedAt: null,
      };
      mockEventSources[1].simulateMessage(mockData);

      expect(onReconnect).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('should not call onReconnect on initial connection', () => {
      const onUpdate = vi.fn();
      const onReconnect = vi.fn();

      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate, {
        onReconnect,
      });

      // Initial snapshot
      const mockData = {
        type: 'scoreboard_snapshot',
        homeTeamName: 'Home',
        awayTeamName: 'Away',
        homeScore: 0,
        awayScore: 0,
        homeJerseyColor: '#FF0000',
        awayJerseyColor: '#0000FF',
        clockMode: 'stopped',
        clockSeconds: 0,
        clockStartedAt: null,
      };
      mockEventSources[0].simulateMessage(mockData);

      expect(onReconnect).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe('Cleanup', () => {
    it('should close connection on cleanup', () => {
      const onUpdate = vi.fn();
      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate);

      const closeSpy = vi.spyOn(mockEventSources[0], 'close');

      cleanup();

      expect(closeSpy).toHaveBeenCalled();
      expect(mockEventSources[0].readyState).toBe(mockEventSources[0].CLOSED);
    });

    it('should cancel pending reconnection attempts on cleanup', async () => {
      const onUpdate = vi.fn();
      const cleanup = scoreboardApi.streamUpdates('test-slug', onUpdate);

      // Trigger error
      mockEventSources[0].simulateError();

      // Cleanup before reconnection
      cleanup();

      // Wait for would-be reconnection time
      await vi.advanceTimersByTimeAsync(1000);

      // Should not have attempted reconnection
      expect(mockEventSources).toHaveLength(1);
    });
  });
});
