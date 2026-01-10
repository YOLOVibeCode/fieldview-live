/**
 * Chat Message Transport Abstraction
 * 
 * Defines the interface for delivering and receiving chat messages.
 * Follows Interface Segregation Principle (ISP) - small, focused interface.
 * 
 * ## Purpose
 * - Abstracts network primitives (SSE, WebSocket, etc.) from business logic
 * - Enables fast, deterministic testing with mock implementations
 * - Supports multi-user simulation without real network connections
 * 
 * ## Implementations
 * - `SSEMessageTransport`: Production implementation using Server-Sent Events
 * - `MockMessageTransport`: Test implementation for multi-user simulation
 * 
 * @example Production usage
 * ```typescript
 * const transport = new SSEMessageTransport();
 * await transport.connect('game-123', 'viewer-token');
 * transport.onMessage((msg) => console.log(msg));
 * await transport.sendMessage('Hello!');
 * ```
 * 
 * @example Testing usage
 * ```typescript
 * const transport = new MockMessageTransport('Alice');
 * await transport.connect('game-123', 'token');
 * // Simulate multi-user without network
 * ```
 */

/**
 * A single chat message event
 */
export interface ChatMessageEvent {
  /** Unique message ID (UUID) */
  id: string;
  
  /** Display name of the sender (e.g., "Alice S.") */
  displayName: string;
  
  /** Message text content (max 240 chars) */
  message: string;
  
  /** ISO 8601 timestamp when message was created */
  createdAt: string;
}

/**
 * Initial snapshot of chat history
 */
export interface ChatSnapshotEvent {
  /** Array of recent messages (newest first) */
  messages: ChatMessageEvent[];
  
  /** Total message count in the game */
  total: number;
}

/**
 * Unsubscribe function returned by event handlers
 */
export type UnsubscribeFn = () => void;

/**
 * Message Transport Interface (ISP)
 * 
 * Abstracts the mechanism for delivering and receiving chat messages.
 * Each method has a single, focused responsibility.
 */
export interface IMessageTransport {
  /**
   * Connect to chat for a specific game
   * 
   * @param gameId - Unique game identifier
   * @param viewerToken - JWT token for viewer authentication
   * @throws Error if connection fails or token is invalid
   */
  connect(gameId: string, viewerToken: string): Promise<void>;
  
  /**
   * Disconnect from chat
   * 
   * Closes the connection and cleans up resources.
   * Safe to call multiple times.
   */
  disconnect(): void;
  
  /**
   * Send a message to the game chat
   * 
   * @param text - Message text (1-240 characters)
   * @returns Promise that resolves to the created message
   * @throws Error if not connected or message validation fails
   */
  sendMessage(text: string): Promise<ChatMessageEvent>;
  
  /**
   * Subscribe to new incoming messages
   * 
   * Handler is called whenever a new message arrives from any user.
   * Includes messages sent by the current user (echo).
   * 
   * @param handler - Callback function to receive messages
   * @returns Unsubscribe function to remove the handler
   */
  onMessage(handler: (msg: ChatMessageEvent) => void): UnsubscribeFn;
  
  /**
   * Subscribe to initial chat snapshot
   * 
   * Handler is called once after connection with recent message history.
   * 
   * @param handler - Callback function to receive snapshot
   * @returns Unsubscribe function to remove the handler
   */
  onSnapshot(handler: (snapshot: ChatSnapshotEvent) => void): UnsubscribeFn;
  
  /**
   * Subscribe to connection status changes
   * 
   * Handler is called whenever the connection state changes.
   * 
   * @param handler - Callback function to receive connection status
   * @returns Unsubscribe function to remove the handler
   */
  onConnectionChange(handler: (connected: boolean) => void): UnsubscribeFn;
  
  /**
   * Subscribe to error events
   * 
   * Handler is called whenever an error occurs (connection loss, send failure, etc.)
   * 
   * @param handler - Callback function to receive errors
   * @returns Unsubscribe function to remove the handler
   */
  onError(handler: (error: Error) => void): UnsubscribeFn;
}

