/**
 * Integration Tests: Multi-User Chat Scenarios
 * 
 * Tests complex multi-user chat interactions using MockMessageTransport.
 * These tests run in milliseconds without requiring real network or browsers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGameChat } from '@/hooks/useGameChat';
import { MockMessageTransport } from '@/lib/chat/__mocks__/MockMessageTransport';

describe('Multi-User Chat Integration', () => {
  beforeEach(() => {
    MockMessageTransport.reset();
  });
  
  describe('two users conversation', () => {
    it('should allow Alice and Bob to exchange messages', async () => {
      const aliceTransport = new MockMessageTransport('Alice S.');
      const bobTransport = new MockMessageTransport('Bob J.');
      
      const { result: alice } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'alice-token',
        transport: aliceTransport,
      }));
      
      const { result: bob } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'bob-token',
        transport: bobTransport,
      }));
      
      // Wait for both to connect
      await waitFor(() => {
        expect(alice.current.isConnected).toBe(true);
        expect(bob.current.isConnected).toBe(true);
      });
      
      // Alice sends first message
      await act(async () => {
        await alice.current.sendMessage('Hey Bob! Can you see this?');
      });
      
      // Both should receive it
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(1);
        expect(bob.current.messages).toHaveLength(1);
      });
      
      expect(bob.current.messages[0].displayName).toBe('Alice S.');
      expect(bob.current.messages[0].message).toBe('Hey Bob! Can you see this?');
      
      // Bob responds
      await act(async () => {
        await bob.current.sendMessage('Yes! I can see it. How are you?');
      });
      
      // Both should now have 2 messages
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(2);
        expect(bob.current.messages).toHaveLength(2);
      });
      
      // Newest first
      expect(alice.current.messages[0].displayName).toBe('Bob J.');
      expect(alice.current.messages[0].message).toBe('Yes! I can see it. How are you?');
      
      // Alice replies
      await act(async () => {
        await alice.current.sendMessage('I\'m great! Testing this chat system.');
      });
      
      // Both should have 3 messages
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(3);
        expect(bob.current.messages).toHaveLength(3);
      });
    });
  });
  
  describe('three users group chat', () => {
    it('should broadcast to all three users', async () => {
      const aliceTransport = new MockMessageTransport('Alice');
      const bobTransport = new MockMessageTransport('Bob');
      const charlieTransport = new MockMessageTransport('Charlie');
      
      const { result: alice } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'alice-token',
        transport: aliceTransport,
      }));
      
      const { result: bob } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'bob-token',
        transport: bobTransport,
      }));
      
      const { result: charlie } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'charlie-token',
        transport: charlieTransport,
      }));
      
      // Wait for all to connect
      await waitFor(() => {
        expect(alice.current.isConnected).toBe(true);
        expect(bob.current.isConnected).toBe(true);
        expect(charlie.current.isConnected).toBe(true);
      });
      
      // Alice sends
      await act(async () => {
        await alice.current.sendMessage('Hi everyone!');
      });
      
      // All three should receive
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(1);
        expect(bob.current.messages).toHaveLength(1);
        expect(charlie.current.messages).toHaveLength(1);
      });
      
      // Bob sends
      await act(async () => {
        await bob.current.sendMessage('Hey Alice!');
      });
      
      // All have 2 messages
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(2);
        expect(bob.current.messages).toHaveLength(2);
        expect(charlie.current.messages).toHaveLength(2);
      });
      
      // Charlie sends
      await act(async () => {
        await charlie.current.sendMessage('Hello both!');
      });
      
      // All have 3 messages
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(3);
        expect(bob.current.messages).toHaveLength(3);
        expect(charlie.current.messages).toHaveLength(3);
      });
    });
  });
  
  describe('10 concurrent users', () => {
    it('should broadcast to all 10 users efficiently', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        transport: new MockMessageTransport(`User${i}`),
        hook: null as any,
      }));
      
      // Render all hooks
      users.forEach(user => {
        const { result } = renderHook(() => useGameChat({
          gameId: 'game-stress-test',
          viewerToken: `token-${user.transport}`,
          transport: user.transport,
        }));
        user.hook = result;
      });
      
      // Wait for all to connect
      await waitFor(() => {
        users.forEach(user => {
          expect(user.hook.current.isConnected).toBe(true);
        });
      });
      
      // User 0 sends a message
      await act(async () => {
        await users[0].hook.current.sendMessage('Hello everyone!');
      });
      
      // All 10 users should receive it
      await waitFor(() => {
        users.forEach(user => {
          expect(user.hook.current.messages).toHaveLength(1);
          expect(user.hook.current.messages[0].displayName).toBe('User0');
          expect(user.hook.current.messages[0].message).toBe('Hello everyone!');
        });
      });
    });
  });
  
  describe('late joiner', () => {
    it('should receive previous messages in snapshot', async () => {
      const aliceTransport = new MockMessageTransport('Alice');
      
      const { result: alice } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'alice-token',
        transport: aliceTransport,
      }));
      
      await waitFor(() => {
        expect(alice.current.isConnected).toBe(true);
      });
      
      // Alice sends 3 messages
      await act(async () => {
        await alice.current.sendMessage('First message');
        await alice.current.sendMessage('Second message');
        await alice.current.sendMessage('Third message');
      });
      
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(3);
      });
      
      // Bob joins late
      const bobTransport = new MockMessageTransport('Bob');
      const { result: bob } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'bob-token',
        transport: bobTransport,
      }));
      
      // Bob should get all 3 messages in snapshot
      await waitFor(() => {
        expect(bob.current.isConnected).toBe(true);
        expect(bob.current.messages).toHaveLength(3);
      });
      
      // Newest first
      expect(bob.current.messages[0].message).toBe('Third message');
      expect(bob.current.messages[1].message).toBe('Second message');
      expect(bob.current.messages[2].message).toBe('First message');
    });
  });
  
  describe('user disconnect', () => {
    it('should not break other users when one disconnects', async () => {
      const aliceTransport = new MockMessageTransport('Alice');
      const bobTransport = new MockMessageTransport('Bob');
      
      const { result: alice } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'alice-token',
        transport: aliceTransport,
      }));
      
      const { result: bob } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'bob-token',
        transport: bobTransport,
      }));
      
      await waitFor(() => {
        expect(alice.current.isConnected).toBe(true);
        expect(bob.current.isConnected).toBe(true);
      });
      
      // Bob disconnects
      act(() => {
        bobTransport.disconnect();
      });
      
      await waitFor(() => {
        expect(bob.current.isConnected).toBe(false);
      });
      
      // Alice sends message
      await act(async () => {
        await alice.current.sendMessage('Is anyone there?');
      });
      
      // Alice should receive it (echo)
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(1);
      });
      
      // Bob should not (disconnected)
      expect(bob.current.messages).toHaveLength(0);
    });
  });
  
  describe('game isolation', () => {
    it('should not mix messages between different games', async () => {
      const alice = new MockMessageTransport('Alice');
      const bob = new MockMessageTransport('Bob');
      
      const { result: aliceHook } = renderHook(() => useGameChat({
        gameId: 'game-1',
        viewerToken: 'alice-token',
        transport: alice,
      }));
      
      const { result: bobHook } = renderHook(() => useGameChat({
        gameId: 'game-2',
        viewerToken: 'bob-token',
        transport: bob,
      }));
      
      await waitFor(() => {
        expect(aliceHook.current.isConnected).toBe(true);
        expect(bobHook.current.isConnected).toBe(true);
      });
      
      // Alice sends to game-1
      await act(async () => {
        await aliceHook.current.sendMessage('Hello game 1!');
      });
      
      // Bob sends to game-2
      await act(async () => {
        await bobHook.current.sendMessage('Hello game 2!');
      });
      
      await waitFor(() => {
        expect(aliceHook.current.messages).toHaveLength(1);
        expect(bobHook.current.messages).toHaveLength(1);
      });
      
      // Each should only see their own game's message
      expect(aliceHook.current.messages[0].message).toBe('Hello game 1!');
      expect(bobHook.current.messages[0].message).toBe('Hello game 2!');
    });
  });
  
  describe('rapid message sending', () => {
    it('should handle rapid messages from single user', async () => {
      const aliceTransport = new MockMessageTransport('Alice');
      
      const { result: alice } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'alice-token',
        transport: aliceTransport,
      }));
      
      await waitFor(() => {
        expect(alice.current.isConnected).toBe(true);
      });
      
      // Send 5 messages rapidly
      await act(async () => {
        await alice.current.sendMessage('Message 1');
        await alice.current.sendMessage('Message 2');
        await alice.current.sendMessage('Message 3');
        await alice.current.sendMessage('Message 4');
        await alice.current.sendMessage('Message 5');
      });
      
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(5);
      });
      
      // Verify all messages present (newest first)
      expect(alice.current.messages[0].message).toBe('Message 5');
      expect(alice.current.messages[4].message).toBe('Message 1');
    });
    
    it('should handle rapid messages from multiple users', async () => {
      const alice = new MockMessageTransport('Alice');
      const bob = new MockMessageTransport('Bob');
      const charlie = new MockMessageTransport('Charlie');
      
      const { result: aliceHook } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'alice-token',
        transport: alice,
      }));
      
      const { result: bobHook } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'bob-token',
        transport: bob,
      }));
      
      const { result: charlieHook } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'charlie-token',
        transport: charlie,
      }));
      
      await waitFor(() => {
        expect(aliceHook.current.isConnected).toBe(true);
        expect(bobHook.current.isConnected).toBe(true);
        expect(charlieHook.current.isConnected).toBe(true);
      });
      
      // All send at once
      await act(async () => {
        await Promise.all([
          aliceHook.current.sendMessage('Alice msg'),
          bobHook.current.sendMessage('Bob msg'),
          charlieHook.current.sendMessage('Charlie msg'),
        ]);
      });
      
      // All should have 3 messages
      await waitFor(() => {
        expect(aliceHook.current.messages).toHaveLength(3);
        expect(bobHook.current.messages).toHaveLength(3);
        expect(charlieHook.current.messages).toHaveLength(3);
      });
    });
  });
  
  describe('network latency simulation', () => {
    it('should handle simulated network delay', async () => {
      MockMessageTransport.setLatency(50);
      
      const aliceTransport = new MockMessageTransport('Alice');
      
      const { result: alice } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'alice-token',
        transport: aliceTransport,
      }));
      
      await waitFor(() => {
        expect(alice.current.isConnected).toBe(true);
      }, { timeout: 200 });
      
      const start = Date.now();
      
      await act(async () => {
        await alice.current.sendMessage('Test');
      });
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(50);
      
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(1);
      });
      
      MockMessageTransport.setLatency(0); // Reset
    });
  });
  
  describe('message ordering', () => {
    it('should maintain newest-first order', async () => {
      const aliceTransport = new MockMessageTransport('Alice');
      
      const { result: alice } = renderHook(() => useGameChat({
        gameId: 'game-123',
        viewerToken: 'alice-token',
        transport: aliceTransport,
      }));
      
      await waitFor(() => {
        expect(alice.current.isConnected).toBe(true);
      });
      
      // Send messages with slight delay
      await act(async () => {
        await alice.current.sendMessage('First');
        await new Promise(resolve => setTimeout(resolve, 10));
        await alice.current.sendMessage('Second');
        await new Promise(resolve => setTimeout(resolve, 10));
        await alice.current.sendMessage('Third');
      });
      
      await waitFor(() => {
        expect(alice.current.messages).toHaveLength(3);
      });
      
      // Should be newest first
      const messages = alice.current.messages.map(m => m.message);
      expect(messages).toEqual(['Third', 'Second', 'First']);
    });
  });
});

