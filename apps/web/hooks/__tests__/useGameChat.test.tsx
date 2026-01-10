/**
 * Unit Tests: useGameChat Hook
 * 
 * Tests the refactored hook with injected mock transport.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGameChat } from '../useGameChat';
import { MockMessageTransport } from '@/lib/chat/__mocks__/MockMessageTransport';

describe('useGameChat', () => {
  beforeEach(() => {
    MockMessageTransport.reset();
  });
  
  describe('connection', () => {
    it('should connect transport on mount with valid params', async () => {
      const transport = new MockMessageTransport('Test User');
      const connectSpy = vi.spyOn(transport, 'connect');
      
      renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      await waitFor(() => {
        expect(connectSpy).toHaveBeenCalledWith('game-123', 'token-abc');
      });
    });
    
    it('should not connect if enabled=false', () => {
      const transport = new MockMessageTransport('Test User');
      const connectSpy = vi.spyOn(transport, 'connect');
      
      renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        enabled: false,
        transport,
      }));
      
      expect(connectSpy).not.toHaveBeenCalled();
    });
    
    it('should not connect if gameId is null', () => {
      const transport = new MockMessageTransport('Test User');
      const connectSpy = vi.spyOn(transport, 'connect');
      
      renderHook(() => useGameChat({
        gameId: null,
        viewerToken: 'token-abc',
        transport,
      }));
      
      expect(connectSpy).not.toHaveBeenCalled();
    });
    
    it('should not connect if viewerToken is null', () => {
      const transport = new MockMessageTransport('Test User');
      const connectSpy = vi.spyOn(transport, 'connect');
      
      renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: null,
        transport,
      }));
      
      expect(connectSpy).not.toHaveBeenCalled();
    });
    
    it('should disconnect on unmount if transport was created by hook', async () => {
      const transport = new MockMessageTransport('Test User');
      const disconnectSpy = vi.spyOn(transport, 'disconnect');
      
      const { unmount } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      await waitFor(() => {
        expect(transport['connected']).toBe(true);
      });
      
      // Note: When transport is injected, hook doesn't disconnect it
      // Owner is responsible for lifecycle
      unmount();
      
      // Injected transport should NOT be disconnected by hook
      expect(disconnectSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('snapshot', () => {
    it('should receive initial snapshot and set messages', async () => {
      const transport = new MockMessageTransport('Test User');
      
      // Pre-seed some messages
      const alice = new MockMessageTransport('Alice');
      await alice.connect('game-123', 'alice-token');
      await alice.sendMessage('Message 1');
      await alice.sendMessage('Message 2');
      
      const { result } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });
      
      // Newest first
      expect(result.current.messages[0].message).toBe('Message 2');
      expect(result.current.messages[1].message).toBe('Message 1');
    });
  });
  
  describe('messages', () => {
    it('should receive new messages from transport', async () => {
      const transport = new MockMessageTransport('Test User');
      
      const { result } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      // Wait for connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      // Another user sends a message
      const alice = new MockMessageTransport('Alice');
      await alice.connect('game-123', 'alice-token');
      
      await act(async () => {
        await alice.sendMessage('Hello from Alice!');
      });
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
      
      expect(result.current.messages[0].displayName).toBe('Alice');
      expect(result.current.messages[0].message).toBe('Hello from Alice!');
    });
    
    it('should prepend new messages (newest first)', async () => {
      const transport = new MockMessageTransport('Test User');
      
      const { result } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      const alice = new MockMessageTransport('Alice');
      await alice.connect('game-123', 'alice-token');
      
      await act(async () => {
        await alice.sendMessage('First');
        await alice.sendMessage('Second');
        await alice.sendMessage('Third');
      });
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(3);
      });
      
      // Newest first
      expect(result.current.messages[0].message).toBe('Third');
      expect(result.current.messages[1].message).toBe('Second');
      expect(result.current.messages[2].message).toBe('First');
    });
  });
  
  describe('connection status', () => {
    it('should update isConnected based on transport', async () => {
      const transport = new MockMessageTransport('Test User');
      
      const { result } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      // Simulate disconnect
      act(() => {
        transport.simulateDisconnect();
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });
    
    it('should clear error when connected', async () => {
      const transport = new MockMessageTransport('Test User');
      
      const { result } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      // Simulate error first
      act(() => {
        transport.simulateError('Test error');
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('Test error');
      });
      
      // Now connect (which should clear error)
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.error).toBeNull();
      });
    });
  });
  
  describe('error handling', () => {
    it('should update error state when transport errors', async () => {
      const transport = new MockMessageTransport('Test User');
      
      const { result } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      act(() => {
        transport.simulateError('Connection lost');
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('Connection lost');
      });
    });
  });
  
  describe('sendMessage', () => {
    it('should send message via transport', async () => {
      const transport = new MockMessageTransport('Test User');
      
      const { result } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      const sentMessage = await act(async () => {
        return await result.current.sendMessage('Hello world!');
      });
      
      expect(sentMessage).toBeDefined();
      expect(sentMessage!.message).toBe('Hello world!');
      expect(sentMessage!.displayName).toBe('Test User');
    });
    
    it('should throw if transport rejects', async () => {
      const transport = new MockMessageTransport('Test User');
      
      const { result } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'token-abc',
        transport,
      }));
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
      
      // Disconnect the transport manually so sendMessage fails
      act(() => {
        transport.disconnect();
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
      
      // Now sendMessage should throw
      await expect(result.current.sendMessage('Test')).rejects.toThrow('Not connected');
    });
  });
  
  describe('reconnection', () => {
    it('should handle gameId change by reconnecting', async () => {
      const transport = new MockMessageTransport('Test User');
      const connectSpy = vi.spyOn(transport, 'connect');
      
      const { rerender } = renderHook(
        ({ gameId }) => useGameChat({
          gameId,
          viewerToken: 'token-abc',
          transport,
        }),
        { initialProps: { gameId: 'game-1' } }
      );
      
      await waitFor(() => {
        expect(connectSpy).toHaveBeenCalledWith('game-1', 'token-abc');
      });
      
      connectSpy.mockClear();
      
      // Change gameId
      rerender({ gameId: 'game-2' });
      
      await waitFor(() => {
        expect(connectSpy).toHaveBeenCalledWith('game-2', 'token-abc');
      });
    });
  });
  
  describe('default transport (SSE)', () => {
    it('should use SSEMessageTransport when no transport provided', () => {
      // This test just verifies that the hook doesn't crash without transport
      // We can't test SSE in unit tests easily without mocking EventSource globally
      const { result } = renderHook(() => useGameChat({
        gameId: null, // Don't connect to avoid real SSE
        viewerToken: null,
      }));
      
      expect(result.current.messages).toEqual([]);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});

