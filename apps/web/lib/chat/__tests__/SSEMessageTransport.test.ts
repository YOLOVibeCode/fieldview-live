/**
 * Unit Tests: SSEMessageTransport
 * 
 * Tests the production SSE transport implementation with mocked EventSource.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEMessageTransport } from '../SSEMessageTransport';
import type { ChatMessageEvent, ChatSnapshotEvent } from '../IMessageTransport';

// Mock EventSource
class MockEventSource {
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners = new Map<string, Set<(e: MessageEvent) => void>>();
  
  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }
  
  addEventListener(event: string, handler: (e: MessageEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }
  
  close(): void {
    this.listeners.clear();
  }
  
  // Test helper: simulate event
  simulateEvent(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const messageEvent = { data: JSON.stringify(data) } as MessageEvent;
      handlers.forEach(h => h(messageEvent));
    }
  }
  
  // Test helper: simulate error
  simulateError(): void {
    if (this.onerror) this.onerror();
  }
}

// Mock fetch
global.fetch = vi.fn();

// Install EventSource mock
global.EventSource = MockEventSource as unknown as typeof EventSource;

describe('SSEMessageTransport', () => {
  let transport: SSEMessageTransport;
  let mockEventSource: MockEventSource;
  
  beforeEach(() => {
    transport = new SSEMessageTransport();
    vi.clearAllMocks();
    
    // Capture created EventSource
    global.EventSource = vi.fn((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource as any as EventSource;
    }) as any;
  });
  
  afterEach(() => {
    transport.disconnect();
  });
  
  describe('connect()', () => {
    it('should create EventSource with correct URL', async () => {
      await transport.connect('game-123', 'token-abc');
      
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/games/game-123/chat/stream?token=token-abc')
      );
    });
    
    it('should notify connection handlers when opened', async () => {
      const connectionHandler = vi.fn();
      transport.onConnectionChange(connectionHandler);
      
      await transport.connect('game-123', 'token-abc');
      
      // Wait for async onopen
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(connectionHandler).toHaveBeenCalledWith(true);
    });
    
    it('should disconnect existing connection before reconnecting', async () => {
      await transport.connect('game-123', 'token-abc');
      const firstEventSource = mockEventSource;
      const closeSpy = vi.spyOn(firstEventSource, 'close');
      
      await transport.connect('game-456', 'token-xyz');
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });
  
  describe('onSnapshot()', () => {
    it('should receive initial chat snapshot', async () => {
      const snapshotHandler = vi.fn();
      transport.onSnapshot(snapshotHandler);
      
      await transport.connect('game-123', 'token-abc');
      
      const mockSnapshot: ChatSnapshotEvent = {
        messages: [
          { id: '1', displayName: 'Alice', message: 'Hello', createdAt: '2026-01-09T12:00:00Z' },
        ],
        total: 1,
      };
      
      mockEventSource.simulateEvent('chat_snapshot', mockSnapshot);
      
      expect(snapshotHandler).toHaveBeenCalledWith(mockSnapshot);
    });
    
    it('should support multiple snapshot handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      transport.onSnapshot(handler1);
      transport.onSnapshot(handler2);
      
      await transport.connect('game-123', 'token-abc');
      
      const mockSnapshot: ChatSnapshotEvent = { messages: [], total: 0 };
      mockEventSource.simulateEvent('chat_snapshot', mockSnapshot);
      
      expect(handler1).toHaveBeenCalledWith(mockSnapshot);
      expect(handler2).toHaveBeenCalledWith(mockSnapshot);
    });
  });
  
  describe('onMessage()', () => {
    it('should receive new chat messages', async () => {
      const messageHandler = vi.fn();
      transport.onMessage(messageHandler);
      
      await transport.connect('game-123', 'token-abc');
      
      const mockMessage: ChatMessageEvent = {
        id: 'msg-1',
        displayName: 'Bob',
        message: 'Hi everyone!',
        createdAt: '2026-01-09T12:05:00Z',
      };
      
      mockEventSource.simulateEvent('chat_message', mockMessage);
      
      expect(messageHandler).toHaveBeenCalledWith(mockMessage);
    });
    
    it('should support multiple message handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      transport.onMessage(handler1);
      transport.onMessage(handler2);
      
      await transport.connect('game-123', 'token-abc');
      
      const mockMessage: ChatMessageEvent = {
        id: 'msg-1',
        displayName: 'Charlie',
        message: 'Test',
        createdAt: '2026-01-09T12:10:00Z',
      };
      
      mockEventSource.simulateEvent('chat_message', mockMessage);
      
      expect(handler1).toHaveBeenCalledWith(mockMessage);
      expect(handler2).toHaveBeenCalledWith(mockMessage);
    });
  });
  
  describe('onConnectionChange()', () => {
    it('should emit true when connection opens', async () => {
      const connectionHandler = vi.fn();
      transport.onConnectionChange(connectionHandler);
      
      await transport.connect('game-123', 'token-abc');
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(connectionHandler).toHaveBeenCalledWith(true);
    });
    
    it('should emit false on connection error', async () => {
      const connectionHandler = vi.fn();
      transport.onConnectionChange(connectionHandler);
      
      await transport.connect('game-123', 'token-abc');
      mockEventSource.simulateError();
      
      expect(connectionHandler).toHaveBeenCalledWith(false);
    });
    
    it('should emit false on disconnect', async () => {
      const connectionHandler = vi.fn();
      transport.onConnectionChange(connectionHandler);
      
      await transport.connect('game-123', 'token-abc');
      connectionHandler.mockClear();
      
      transport.disconnect();
      
      expect(connectionHandler).toHaveBeenCalledWith(false);
    });
  });
  
  describe('onError()', () => {
    it('should emit error on connection failure', async () => {
      const errorHandler = vi.fn();
      transport.onError(errorHandler);
      
      await transport.connect('game-123', 'token-abc');
      mockEventSource.simulateError();
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(errorHandler.mock.calls[0][0].message).toContain('Connection lost');
    });
    
    it('should handle malformed snapshot data', async () => {
      const errorHandler = vi.fn();
      transport.onError(errorHandler);
      
      await transport.connect('game-123', 'token-abc');
      
      // Simulate malformed JSON
      const handlers = (mockEventSource as any).listeners.get('chat_snapshot');
      handlers?.forEach((h: (e: MessageEvent) => void) => {
        h({ data: 'invalid-json' } as MessageEvent);
      });
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });
  
  describe('disconnect()', () => {
    it('should close EventSource connection', async () => {
      await transport.connect('game-123', 'token-abc');
      const closeSpy = vi.spyOn(mockEventSource, 'close');
      
      transport.disconnect();
      
      expect(closeSpy).toHaveBeenCalled();
    });
    
    it('should be safe to call multiple times', async () => {
      await transport.connect('game-123', 'token-abc');
      
      transport.disconnect();
      transport.disconnect();
      transport.disconnect();
      
      // Should not throw
      expect(true).toBe(true);
    });
    
    it('should be safe to call without connecting', () => {
      transport.disconnect();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
  
  describe('sendMessage()', () => {
    beforeEach(() => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'msg-123',
          displayName: 'Alice',
          message: 'Test message',
          createdAt: '2026-01-09T12:00:00Z',
        }),
      });
    });
    
    it('should send message via POST request', async () => {
      await transport.connect('game-123', 'token-abc');
      
      await transport.sendMessage('Hello world!');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/games/game-123/chat/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token-abc',
          }),
          body: JSON.stringify({ message: 'Hello world!' }),
        })
      );
    });
    
    it('should return created message', async () => {
      await transport.connect('game-123', 'token-abc');
      
      const result = await transport.sendMessage('Test');
      
      expect(result).toEqual({
        id: 'msg-123',
        displayName: 'Alice',
        message: 'Test message',
        createdAt: '2026-01-09T12:00:00Z',
      });
    });
    
    it('should throw if not connected', async () => {
      await expect(transport.sendMessage('Test')).rejects.toThrow('Not connected');
    });
    
    it('should throw on API error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Message too long' }),
      });
      
      await transport.connect('game-123', 'token-abc');
      
      await expect(transport.sendMessage('Test')).rejects.toThrow('Message too long');
    });
  });
  
  describe('unsubscribe functions', () => {
    it('should remove message handler when unsubscribed', async () => {
      const messageHandler = vi.fn();
      const unsubscribe = transport.onMessage(messageHandler);
      
      await transport.connect('game-123', 'token-abc');
      
      const mockMessage: ChatMessageEvent = {
        id: 'msg-1',
        displayName: 'Test',
        message: 'First',
        createdAt: '2026-01-09T12:00:00Z',
      };
      
      mockEventSource.simulateEvent('chat_message', mockMessage);
      expect(messageHandler).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      messageHandler.mockClear();
      
      mockEventSource.simulateEvent('chat_message', mockMessage);
      expect(messageHandler).not.toHaveBeenCalled();
    });
    
    it('should remove connection handler when unsubscribed', async () => {
      const connectionHandler = vi.fn();
      const unsubscribe = transport.onConnectionChange(connectionHandler);
      
      await transport.connect('game-123', 'token-abc');
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(connectionHandler).toHaveBeenCalled();
      connectionHandler.mockClear();
      
      // Unsubscribe
      unsubscribe();
      
      mockEventSource.simulateError();
      expect(connectionHandler).not.toHaveBeenCalled();
    });
  });
});

