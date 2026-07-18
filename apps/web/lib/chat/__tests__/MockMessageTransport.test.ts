/**
 * Unit Tests: MockMessageTransport
 * 
 * Tests the mock transport implementation for multi-user simulation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockMessageTransport } from '../__mocks__/MockMessageTransport';
import type { ChatMessageEvent } from '../IMessageTransport';

describe('MockMessageTransport', () => {
  beforeEach(() => {
    MockMessageTransport.reset();
  });
  
  afterEach(() => {
    MockMessageTransport.reset();
  });
  
  describe('single user', () => {
    it('should connect and send message', async () => {
      const transport = new MockMessageTransport('Alice S.');
      const messages: ChatMessageEvent[] = [];
      
      transport.onMessage(msg => messages.push(msg));
      await transport.connect('game-123', 'token-alice');
      
      const sent = await transport.sendMessage('Hello!');
      
      expect(sent.displayName).toBe('Alice S.');
      expect(sent.message).toBe('Hello!');
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe(sent.id);
    });
    
    it('should receive snapshot on connect', async () => {
      const transport = new MockMessageTransport('Bob J.');
      let snapshot: any = null;
      
      transport.onSnapshot(snap => snapshot = snap);
      await transport.connect('game-123', 'token-bob');
      
      expect(snapshot).not.toBeNull();
      expect(snapshot.messages).toEqual([]);
      expect(snapshot.total).toBe(0);
    });
    
    it('should notify connection change', async () => {
      const transport = new MockMessageTransport('Charlie B.');
      const statuses: boolean[] = [];
      
      transport.onConnectionChange(connected => statuses.push(connected));
      
      await transport.connect('game-123', 'token-charlie');
      expect(statuses).toContain(true);
      
      transport.disconnect();
      expect(statuses).toContain(false);
    });
  });
  
  describe('two users', () => {
    it('should broadcast messages between users', async () => {
      const alice = new MockMessageTransport('Alice S.');
      const bob = new MockMessageTransport('Bob J.');
      
      const aliceMessages: ChatMessageEvent[] = [];
      const bobMessages: ChatMessageEvent[] = [];
      
      alice.onMessage(msg => aliceMessages.push(msg));
      bob.onMessage(msg => bobMessages.push(msg));
      
      await alice.connect('game-123', 'token-alice');
      await bob.connect('game-123', 'token-bob');
      
      // Alice sends
      await alice.sendMessage('Hi Bob!');
      
      // Both should receive (including Alice - echo behavior)
      expect(aliceMessages).toHaveLength(1);
      expect(bobMessages).toHaveLength(1);
      expect(bobMessages[0].displayName).toBe('Alice S.');
      expect(bobMessages[0].message).toBe('Hi Bob!');
    });
    
    it('should handle bidirectional conversation', async () => {
      const alice = new MockMessageTransport('Alice S.');
      const bob = new MockMessageTransport('Bob J.');
      
      const aliceMessages: ChatMessageEvent[] = [];
      const bobMessages: ChatMessageEvent[] = [];
      
      alice.onMessage(msg => aliceMessages.push(msg));
      bob.onMessage(msg => bobMessages.push(msg));
      
      await alice.connect('game-123', 'token-alice');
      await bob.connect('game-123', 'token-bob');
      
      // Alice → Bob
      await alice.sendMessage('Hello!');
      
      // Bob → Alice
      await bob.sendMessage('Hey there!');
      
      // Alice → Bob
      await alice.sendMessage('How are you?');
      
      // Both should have all 3 messages
      expect(aliceMessages).toHaveLength(3);
      expect(bobMessages).toHaveLength(3);
      
      // Verify order (newest first in snapshot, but handlers get them in send order)
      expect(aliceMessages[0].displayName).toBe('Alice S.');
      expect(aliceMessages[1].displayName).toBe('Bob J.');
      expect(aliceMessages[2].displayName).toBe('Alice S.');
    });
  });
  
  describe('late joiner', () => {
    it('should receive snapshot of previous messages', async () => {
      const alice = new MockMessageTransport('Alice S.');
      await alice.connect('game-123', 'token-alice');
      
      // Alice sends 3 messages
      await alice.sendMessage('First message');
      await alice.sendMessage('Second message');
      await alice.sendMessage('Third message');
      
      // Bob joins later
      const bob = new MockMessageTransport('Bob J.');
      let snapshot: any = null;
      bob.onSnapshot(snap => snapshot = snap);
      
      await bob.connect('game-123', 'token-bob');
      
      // Bob should get all 3 messages in snapshot
      expect(snapshot).not.toBeNull();
      expect(snapshot.messages).toHaveLength(3);
      expect(snapshot.total).toBe(3);
      
      // Newest first
      expect(snapshot.messages[0].message).toBe('Third message');
      expect(snapshot.messages[1].message).toBe('Second message');
      expect(snapshot.messages[2].message).toBe('First message');
    });
  });
  
  describe('disconnect', () => {
    it('should remove user from broadcast list', async () => {
      const alice = new MockMessageTransport('Alice S.');
      const bob = new MockMessageTransport('Bob J.');
      
      const bobMessages: ChatMessageEvent[] = [];
      bob.onMessage(msg => bobMessages.push(msg));
      
      await alice.connect('game-123', 'token-alice');
      await bob.connect('game-123', 'token-bob');
      
      // Bob disconnects
      bob.disconnect();
      
      // Alice sends message
      await alice.sendMessage('Is anyone there?');
      
      // Bob should not receive it (disconnected)
      expect(bobMessages).toHaveLength(0);
    });
    
    it('should be safe to call multiple times', async () => {
      const transport = new MockMessageTransport('Alice S.');
      await transport.connect('game-123', 'token-alice');
      
      transport.disconnect();
      transport.disconnect();
      transport.disconnect();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
  
  describe('game isolation', () => {
    it('should not broadcast between different games', async () => {
      const alice = new MockMessageTransport('Alice S.');
      const bob = new MockMessageTransport('Bob J.');
      
      const aliceMessages: ChatMessageEvent[] = [];
      const bobMessages: ChatMessageEvent[] = [];
      
      alice.onMessage(msg => aliceMessages.push(msg));
      bob.onMessage(msg => bobMessages.push(msg));
      
      // Different games
      await alice.connect('game-1', 'token-alice');
      await bob.connect('game-2', 'token-bob');
      
      await alice.sendMessage('Hello game 1!');
      await bob.sendMessage('Hello game 2!');
      
      // Each should only see their own message
      expect(aliceMessages).toHaveLength(1);
      expect(bobMessages).toHaveLength(1);
      expect(aliceMessages[0].message).toBe('Hello game 1!');
      expect(bobMessages[0].message).toBe('Hello game 2!');
    });
  });
  
  describe('10 concurrent users', () => {
    it('should broadcast to all users', async () => {
      const users = Array.from({ length: 10 }, (_, i) => 
        new MockMessageTransport(`User${i}`)
      );
      
      const messageCounts = users.map(() => 0);
      
      users.forEach((user, i) => {
        user.onMessage(() => messageCounts[i]++);
      });
      
      // All connect to same game
      await Promise.all(users.map(u => u.connect('game-123', `token-${u}`)));
      
      // User 0 sends a message
      await users[0].sendMessage('Hello everyone!');
      
      // All 10 users should receive it (including sender)
      messageCounts.forEach(count => {
        expect(count).toBe(1);
      });
    });
  });
  
  describe('message validation', () => {
    it('should reject empty messages', async () => {
      const transport = new MockMessageTransport('Alice S.');
      await transport.connect('game-123', 'token-alice');
      
      await expect(transport.sendMessage('')).rejects.toThrow('Message cannot be empty');
      await expect(transport.sendMessage('   ')).rejects.toThrow('Message cannot be empty');
    });
    
    it('should reject messages > 240 characters', async () => {
      const transport = new MockMessageTransport('Alice S.');
      await transport.connect('game-123', 'token-alice');
      
      const longMessage = 'A'.repeat(241);
      await expect(transport.sendMessage(longMessage)).rejects.toThrow('cannot exceed 240 characters');
    });
    
    it('should accept messages up to 240 characters', async () => {
      const transport = new MockMessageTransport('Alice S.');
      await transport.connect('game-123', 'token-alice');
      
      const maxMessage = 'A'.repeat(240);
      const result = await transport.sendMessage(maxMessage);
      
      expect(result.message).toHaveLength(240);
    });
    
    it('should throw if not connected', async () => {
      const transport = new MockMessageTransport('Alice S.');
      
      await expect(transport.sendMessage('Hello')).rejects.toThrow('Not connected');
    });
  });
  
  describe('latency simulation', () => {
    it('should delay message delivery when latency is set', async () => {
      MockMessageTransport.setLatency(50);
      
      const transport = new MockMessageTransport('Alice S.');
      await transport.connect('game-123', 'token-alice');
      
      const start = Date.now();
      await transport.sendMessage('Test');
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(50);
      
      MockMessageTransport.setLatency(0); // Reset
    });
  });
  
  describe('test helpers', () => {
    it('should simulate disconnect', async () => {
      const transport = new MockMessageTransport('Alice S.');
      const statuses: boolean[] = [];
      
      transport.onConnectionChange(connected => statuses.push(connected));
      await transport.connect('game-123', 'token-alice');
      
      transport.simulateDisconnect();
      
      expect(statuses).toContain(false);
    });
    
    it('should simulate error', async () => {
      const transport = new MockMessageTransport('Alice S.');
      const errors: Error[] = [];
      
      transport.onError(err => errors.push(err));
      await transport.connect('game-123', 'token-alice');
      
      transport.simulateError('Test error');
      
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test error');
    });
    
    it('should reset all state', async () => {
      const alice = new MockMessageTransport('Alice S.');
      await alice.connect('game-123', 'token-alice');
      await alice.sendMessage('Test');
      
      expect(MockMessageTransport.getMessageCount('game-123')).toBe(1);
      expect(MockMessageTransport.getConnectedCount('game-123')).toBe(1);
      
      MockMessageTransport.reset();
      
      expect(MockMessageTransport.getMessageCount('game-123')).toBe(0);
      expect(MockMessageTransport.getConnectedCount('game-123')).toBe(0);
    });
  });
  
  describe('unsubscribe functions', () => {
    it('should remove message handler', async () => {
      const transport = new MockMessageTransport('Alice S.');
      let callCount = 0;
      
      const unsubscribe = transport.onMessage(() => callCount++);
      
      await transport.connect('game-123', 'token-alice');
      await transport.sendMessage('First');
      expect(callCount).toBe(1);
      
      unsubscribe();
      
      await transport.sendMessage('Second');
      expect(callCount).toBe(1); // Didn't increment
    });
  });
});

