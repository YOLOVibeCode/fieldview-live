/**
 * DataEventBus
 * 
 * Event-driven communication for cross-boundary component communication.
 * Per architectural mandate: use event bus instead of direct function calls.
 */

type EventCallback<T = unknown> = (data: T) => void;

class DataEventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Emit an event
   */
  emit<T = unknown>(event: string, data: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event
   */
  subscribe<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.listeners.get(event)!.add(callback as any);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Clear all listeners for an event
   */
  clear(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Clear all listeners
   */
  clearAll(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const dataEventBus = new DataEventBus();

// Event names enum (will be expanded as needed)
export enum DataEvents {
  // Purchase events
  PURCHASE_CREATED = 'purchase:created',
  PURCHASE_COMPLETED = 'purchase:completed',
  PURCHASE_FAILED = 'purchase:failed',

  // Playback events
  SESSION_STARTED = 'session:started',
  SESSION_ENDED = 'session:ended',

  // Game events
  GAME_CREATED = 'game:created',
  GAME_UPDATED = 'game:updated',

  // User events
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
}
