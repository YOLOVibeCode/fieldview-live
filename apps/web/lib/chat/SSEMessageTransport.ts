/**
 * Server-Sent Events (SSE) Message Transport
 * 
 * Production implementation of IMessageTransport using SSE for real-time chat.
 * 
 * ## Features
 * - Real-time message delivery via EventSource
 * - Automatic reconnection on connection loss
 * - Multiple handler subscriptions (pub/sub pattern)
 * - Clean resource management
 * 
 * ## Usage
 * ```typescript
 * const transport = new SSEMessageTransport();
 * 
 * // Subscribe to events before connecting
 * transport.onSnapshot((snapshot) => {
 *   console.log('Initial messages:', snapshot.messages);
 * });
 * 
 * transport.onMessage((msg) => {
 *   console.log('New message:', msg);
 * });
 * 
 * transport.onConnectionChange((connected) => {
 *   console.log('Connected:', connected);
 * });
 * 
 * // Connect to chat
 * await transport.connect('game-123', 'viewer-token-abc');
 * 
 * // Send a message
 * await transport.sendMessage('Hello everyone!');
 * 
 * // Cleanup
 * transport.disconnect();
 * ```
 */

import type {
  IMessageTransport,
  ChatMessageEvent,
  ChatSnapshotEvent,
  UnsubscribeFn,
} from './IMessageTransport';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

/**
 * SSE-based message transport for production use
 */
export class SSEMessageTransport implements IMessageTransport {
  private eventSource: EventSource | null = null;
  private gameId: string | null = null;
  private viewerToken: string | null = null;
  
  // Handler sets for pub/sub pattern
  private messageHandlers = new Set<(msg: ChatMessageEvent) => void>();
  private snapshotHandlers = new Set<(snapshot: ChatSnapshotEvent) => void>();
  private connectionHandlers = new Set<(connected: boolean) => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  
  /**
   * Connect to chat via SSE stream
   */
  async connect(gameId: string, viewerToken: string): Promise<void> {
    // Clean up any existing connection
    this.disconnect();
    
    this.gameId = gameId;
    this.viewerToken = viewerToken;
    
    const url = `${API_URL}/api/public/games/${gameId}/chat/stream?token=${encodeURIComponent(viewerToken)}`;
    
    this.eventSource = new EventSource(url);
    
    // Connection opened
    this.eventSource.onopen = () => {
      console.log('[SSETransport] Connected to chat stream');
      this.notifyConnectionChange(true);
    };
    
    // Receive initial snapshot
    this.eventSource.addEventListener('chat_snapshot', (e: MessageEvent) => {
      try {
        const snapshot: ChatSnapshotEvent = JSON.parse(e.data);
        console.log('[SSETransport] Received snapshot:', snapshot.messages?.length || 0, 'messages');
        this.notifySnapshot(snapshot);
      } catch (err) {
        console.error('[SSETransport] Failed to parse snapshot:', err);
        this.notifyError(new Error('Failed to parse chat snapshot'));
      }
    });
    
    // Receive new messages
    this.eventSource.addEventListener('chat_message', (e: MessageEvent) => {
      try {
        const message: ChatMessageEvent = JSON.parse(e.data);
        console.log('[SSETransport] Received message:', message.id);
        this.notifyMessage(message);
      } catch (err) {
        console.error('[SSETransport] Failed to parse message:', err);
        this.notifyError(new Error('Failed to parse chat message'));
      }
    });
    
    // Keep-alive ping (no action needed)
    this.eventSource.addEventListener('ping', () => {
      // Heartbeat to keep connection alive
    });
    
    // Connection error
    this.eventSource.onerror = () => {
      console.error('[SSETransport] Connection error');
      this.notifyConnectionChange(false);
      this.notifyError(new Error('Connection lost. Reconnecting...'));
      // EventSource will automatically attempt to reconnect
    };
  }
  
  /**
   * Disconnect and clean up resources
   */
  disconnect(): void {
    if (this.eventSource) {
      console.log('[SSETransport] Disconnecting from chat stream');
      this.eventSource.close();
      this.eventSource = null;
      this.notifyConnectionChange(false);
    }
    
    this.gameId = null;
    this.viewerToken = null;
  }
  
  /**
   * Send a message to the chat
   */
  async sendMessage(text: string): Promise<ChatMessageEvent> {
    if (!this.gameId || !this.viewerToken) {
      throw new Error('Not connected. Call connect() first.');
    }
    
    const response = await fetch(
      `${API_URL}/api/public/games/${this.gameId}/chat/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.viewerToken}`,
        },
        body: JSON.stringify({ message: text }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(errorData.error || `Failed to send message: ${response.status}`);
    }
    
    return response.json();
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
        console.error('[SSETransport] Error in message handler:', err);
      }
    });
  }
  
  private notifySnapshot(snapshot: ChatSnapshotEvent): void {
    this.snapshotHandlers.forEach((handler) => {
      try {
        handler(snapshot);
      } catch (err) {
        console.error('[SSETransport] Error in snapshot handler:', err);
      }
    });
  }
  
  private notifyConnectionChange(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (err) {
        console.error('[SSETransport] Error in connection handler:', err);
      }
    });
  }
  
  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.error('[SSETransport] Error in error handler:', err);
      }
    });
  }
}

