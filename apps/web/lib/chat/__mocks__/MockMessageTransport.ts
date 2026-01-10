/**
 * Mock Message Transport
 * 
 * Test implementation of IMessageTransport for unit and integration testing.
 * Simulates multiple users chatting in memory without real network connections.
 * 
 * ## Features
 * - Multi-user simulation (Alice, Bob, Charlie all in same test)
 * - Instant or delayed message delivery (configurable latency)
 * - Connection/error simulation
 * - Game isolation (game-1 separate from game-2)
 * - Zero network dependencies
 * 
 * ## Usage
 * ```typescript
 * // Setup
 * MockMessageTransport.reset();
 * 
 * const alice = new MockMessageTransport('Alice S.');
 * const bob = new MockMessageTransport('Bob J.');
 * 
 * // Track messages
 * const aliceMessages: ChatMessageEvent[] = [];
 * const bobMessages: ChatMessageEvent[] = [];
 * 
 * alice.onMessage(msg => aliceMessages.push(msg));
 * bob.onMessage(msg => bobMessages.push(msg));
 * 
 * // Connect both to same game
 * await alice.connect('game-123', 'alice-token');
 * await bob.connect('game-123', 'bob-token');
 * 
 * // Alice sends message
 * await alice.sendMessage('Hello Bob!');
 * 
 * // Both received it (including Alice, echo behavior)
 * expect(aliceMessages).toHaveLength(1);
 * expect(bobMessages).toHaveLength(1);
 * expect(bobMessages[0].displayName).toBe('Alice S.');
 * ```
 */

import type {
  IMessageTransport,
  ChatMessageEvent,
  ChatSnapshotEvent,
  UnsubscribeFn,
} from '../IMessageTransport';

/**
 * Mock transport for testing multi-user scenarios
 */
export class MockMessageTransport implements IMessageTransport {
  // Static shared state for multi-instance simulation
  private static instances = new Map<string, Set<MockMessageTransport>>();
  private static messages = new Map<string, ChatMessageEvent[]>();
  private static latencyMs = 0;
  
  // Instance state
  private displayName: string;
  private gameId: string | null = null;
  private viewerToken: string | null = null;
  private connected = false;
  
  // Handler sets
  private messageHandlers = new Set<(msg: ChatMessageEvent) => void>();
  private snapshotHandlers = new Set<(snapshot: ChatSnapshotEvent) => void>();
  private connectionHandlers = new Set<(connected: boolean) => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  
  /**
   * Create a mock transport for a user
   * 
   * @param displayName - Display name for this user (e.g., "Alice S.")
   */
  constructor(displayName: string) {
    this.displayName = displayName;
  }
  
  /**
   * Connect to chat for a game
   */
  async connect(gameId: string, viewerToken: string): Promise<void> {
    this.gameId = gameId;
    this.viewerToken = viewerToken;
    this.connected = true;
    
    // Initialize game if needed
    if (!MockMessageTransport.instances.has(gameId)) {
      MockMessageTransport.instances.set(gameId, new Set());
      MockMessageTransport.messages.set(gameId, []);
    }
    
    // Register this instance
    MockMessageTransport.instances.get(gameId)!.add(this);
    
    // Simulate async connection
    await this.delay(MockMessageTransport.latencyMs);
    
    // Emit connection event
    this.notifyConnectionChange(true);
    
    // Send snapshot of existing messages
    const messages = MockMessageTransport.messages.get(gameId) || [];
    this.notifySnapshot({
      messages: [...messages], // Copy to avoid mutation
      total: messages.length,
    });
  }
  
  /**
   * Disconnect from chat
   */
  disconnect(): void {
    if (this.gameId) {
      MockMessageTransport.instances.get(this.gameId)?.delete(this);
    }
    
    this.connected = false;
    this.notifyConnectionChange(false);
    this.gameId = null;
    this.viewerToken = null;
  }
  
  /**
   * Send a message to the chat
   */
  async sendMessage(text: string): Promise<ChatMessageEvent> {
    if (!this.connected || !this.gameId) {
      throw new Error('Not connected. Call connect() first.');
    }
    
    // Validate message
    const trimmed = text.trim();
    if (trimmed.length < 1) {
      throw new Error('Message cannot be empty');
    }
    if (trimmed.length > 240) {
      throw new Error('Message cannot exceed 240 characters');
    }
    
    // Create message
    const message: ChatMessageEvent = {
      id: this.generateId(),
      displayName: this.displayName,
      message: trimmed,
      createdAt: new Date().toISOString(),
    };
    
    // Store message (newest first)
    MockMessageTransport.messages.get(this.gameId)!.unshift(message);
    
    // Simulate network latency
    await this.delay(MockMessageTransport.latencyMs);
    
    // Broadcast to ALL connected transports in this game (including self)
    const instances = MockMessageTransport.instances.get(this.gameId);
    if (instances) {
      instances.forEach((transport) => {
        transport.notifyMessage(message);
      });
    }
    
    return message;
  }
  
  /**
   * Subscribe to new messages
   */
  onMessage(handler: (msg: ChatMessageEvent) => void): UnsubscribeFn {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }
  
  /**
   * Subscribe to initial snapshot
   */
  onSnapshot(handler: (snapshot: ChatSnapshotEvent) => void): UnsubscribeFn {
    this.snapshotHandlers.add(handler);
    return () => this.snapshotHandlers.delete(handler);
  }
  
  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(handler: (connected: boolean) => void): UnsubscribeFn {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }
  
  /**
   * Subscribe to errors
   */
  onError(handler: (error: Error) => void): UnsubscribeFn {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }
  
  // Private notification methods
  
  private notifyMessage(msg: ChatMessageEvent): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(msg);
      } catch (err) {
        console.error('[MockTransport] Error in message handler:', err);
      }
    });
  }
  
  private notifySnapshot(snapshot: ChatSnapshotEvent): void {
    this.snapshotHandlers.forEach((handler) => {
      try {
        handler(snapshot);
      } catch (err) {
        console.error('[MockTransport] Error in snapshot handler:', err);
      }
    });
  }
  
  private notifyConnectionChange(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (err) {
        console.error('[MockTransport] Error in connection handler:', err);
      }
    });
  }
  
  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.error('[MockTransport] Error in error handler:', err);
      }
    });
  }
  
  // Helpers
  
  private generateId(): string {
    return `mock-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async delay(ms: number): Promise<void> {
    if (ms > 0) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  // ==================== TEST HELPERS ====================
  
  /**
   * Simulate network latency for all mock transports
   * 
   * @param ms - Milliseconds to delay message delivery (default: 0)
   */
  static setLatency(ms: number): void {
    MockMessageTransport.latencyMs = ms;
  }
  
  /**
   * Simulate connection loss
   */
  simulateDisconnect(): void {
    this.connected = false;
    this.notifyConnectionChange(false);
  }
  
  /**
   * Simulate error event
   */
  simulateError(message: string): void {
    this.notifyError(new Error(message));
  }
  
  /**
   * Clear all shared state (call between tests)
   */
  static reset(): void {
    MockMessageTransport.instances.clear();
    MockMessageTransport.messages.clear();
    MockMessageTransport.latencyMs = 0;
  }
  
  /**
   * Get message count for a game (testing utility)
   */
  static getMessageCount(gameId: string): number {
    return MockMessageTransport.messages.get(gameId)?.length || 0;
  }
  
  /**
   * Get connected instance count for a game (testing utility)
   */
  static getConnectedCount(gameId: string): number {
    return MockMessageTransport.instances.get(gameId)?.size || 0;
  }
}

