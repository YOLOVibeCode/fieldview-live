/**
 * useConnectionDebug Hook
 * 
 * Aggregates all connection states for unified debugging
 */

import { useState, useEffect, useMemo } from 'react';
import type { ConnectionInfo, ConnectionType, ConnectionState } from '@/lib/debug/types';

export interface ConnectionDebugState {
  stream: ConnectionInfo;
  api: ConnectionInfo;
  chat: ConnectionInfo;
  scoreboard: ConnectionInfo;
  viewers: ConnectionInfo;
}

export function useConnectionDebug(options: {
  streamState?: ConnectionState;
  streamError?: { code: string; message: string; recoverable: boolean };
  streamConnectedAt?: Date;
  streamConnectTime?: number;
  
  chatConnected?: boolean;
  chatError?: string;
  chatConnectedAt?: Date;
  chatConnectTime?: number;
  
  apiHealthy?: boolean;
  apiLatency?: number;
}) {
  const [connections, setConnections] = useState<ConnectionDebugState>({
    stream: {
      type: 'stream',
      state: 'idle',
      metrics: { retryCount: 0 },
    },
    api: {
      type: 'api',
      state: 'connected',
      metrics: { retryCount: 0 },
    },
    chat: {
      type: 'chat',
      state: 'idle',
      metrics: { retryCount: 0 },
    },
    scoreboard: {
      type: 'scoreboard',
      state: 'idle',
      metrics: { retryCount: 0 },
    },
    viewers: {
      type: 'viewers',
      state: 'idle',
      metrics: { retryCount: 0 },
    },
  });

  useEffect(() => {
    setConnections(prev => ({
      ...prev,
      stream: {
        ...prev.stream,
        state: options.streamState || 'idle',
        connectedAt: options.streamConnectedAt,
        lastError: options.streamError ? {
          code: options.streamError.code,
          message: options.streamError.message,
          timestamp: new Date(),
          recoverable: options.streamError.recoverable,
        } : undefined,
        metrics: {
          ...prev.stream.metrics,
          connectTime: options.streamConnectTime,
        },
      },
      chat: {
        ...prev.chat,
        state: options.chatConnected ? 'connected' : 'idle',
        connectedAt: options.chatConnectedAt,
        lastError: options.chatError ? {
          code: 'CHAT_ERROR',
          message: options.chatError,
          timestamp: new Date(),
          recoverable: true,
        } : undefined,
        metrics: {
          ...prev.chat.metrics,
          connectTime: options.chatConnectTime,
        },
      },
      api: {
        ...prev.api,
        state: options.apiHealthy !== false ? 'connected' : 'error',
        metrics: {
          ...prev.api.metrics,
          latency: options.apiLatency,
        },
      },
    }));
  }, [
    options.streamState,
    options.streamError,
    options.streamConnectedAt,
    options.streamConnectTime,
    options.chatConnected,
    options.chatError,
    options.chatConnectedAt,
    options.chatConnectTime,
    options.apiHealthy,
    options.apiLatency,
  ]);

  const overallHealth = useMemo(() => {
    const states = Object.values(connections).map(c => c.state);
    if (states.every(s => s === 'connected')) return 'healthy';
    if (states.some(s => s === 'error')) return 'unhealthy';
    return 'degraded';
  }, [connections]);

  return {
    connections,
    overallHealth,
  };
}
