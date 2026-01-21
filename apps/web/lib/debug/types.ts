/**
 * Debug Type Definitions
 * 
 * Type definitions for connection debugging and observability
 */

export type ConnectionState = 
  | 'idle'       // Not started
  | 'connecting' // In progress
  | 'connected'  // Success
  | 'error'      // Failed (with error details)
  | 'retrying'   // Reconnecting after failure
  | 'disconnected'; // Intentionally closed

export type ConnectionType = 'stream' | 'api' | 'chat' | 'scoreboard' | 'viewers';

export interface ConnectionInfo {
  type: ConnectionType;
  state: ConnectionState;
  connectedAt?: Date;
  lastError?: {
    code: string;
    message: string;
    timestamp: Date;
    recoverable: boolean;
  };
  metrics: {
    connectTime?: number;  // ms to connect
    latency?: number;      // avg response time
    retryCount: number;
  };
}

export interface StreamDebugInfo {
  // Player State
  playerState: 'loading' | 'buffering' | 'playing' | 'paused' | 'error' | 'ended';
  
  // HLS Specific
  hlsVersion: string;
  isLive: boolean;
  
  // Quality
  currentLevel: number;
  currentBitrate: number;
  availableLevels: Array<{ resolution: string; bitrate: number }>;
  autoLevelEnabled: boolean;
  
  // Buffer
  bufferLength: number;  // seconds
  backBufferLength: number;
  
  // Performance
  droppedFrames: number;
  totalFrames: number;
  timeToFirstFrame: number;
  
  // Network
  streamUrl: string;
  lastSegmentLoadTime: number;
  bandwidth: number;  // estimated
  
  // Errors
  lastError?: {
    type: 'network' | 'media' | 'mux' | 'other';
    fatal: boolean;
    details: string;
    timestamp: Date;
  };
  errorHistory: Array<{
    type: string;
    message: string;
    timestamp: Date;
  }>;
}

export interface EndpointHealth {
  url: string;
  lastStatus: number;
  lastLatency: number;
  lastChecked: Date;
  errorRate: number;  // % of failed requests
  avgLatency: number;
  isHealthy: boolean;
  requestCount: number;
  successCount: number;
}

export interface ApiHealthInfo {
  endpoints: {
    bootstrap: EndpointHealth;
    settings: EndpointHealth;
    scoreboard: EndpointHealth;
    viewers: EndpointHealth;
    chat: EndpointHealth;
    unlock: EndpointHealth;
  };
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export type NetworkRequestType = 'xhr' | 'fetch' | 'sse' | 'websocket';

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  type: NetworkRequestType;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status?: number;
  statusText?: string;
  requestHeaders: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
  size?: number; // bytes
}

export interface DebugMetrics {
  pageLoadTime: number;
  bootstrapFetchTime?: number;
  streamConnectTime?: number;
  chatConnectTime?: number;
  totalActiveTime: number;
  timestamp: Date;
}

export interface DebugReport {
  reportVersion: string;
  generatedAt: string;
  pageUrl: string;
  browser: {
    userAgent: string;
    platform: string;
    screenSize: string;
  };
  stream?: StreamDebugInfo;
  api?: ApiHealthInfo;
  chat?: {
    connected: boolean;
    transport: string;
    messageCount: number;
    gameId?: string;
  };
  networkLog: NetworkRequest[];
  consoleErrors: string[];
  metrics: DebugMetrics;
}
