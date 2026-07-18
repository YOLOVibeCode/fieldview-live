/**
 * MetricsDebugTab Component
 * 
 * Displays performance metrics
 */

import type { DebugMetrics } from '@/lib/debug/types';

interface MetricsDebugTabProps {
  metrics: DebugMetrics;
}

export function MetricsDebugTab({ metrics }: MetricsDebugTabProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-4" data-testid="debug-tab-metrics">
      {/* Page Load */}
      <section>
        <h4 className="text-blue-400 font-semibold mb-2">Page Load</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>Page Load Time:</span>
            <span className="text-white">{formatTime(metrics.pageLoadTime)}</span>
          </div>
        </div>
      </section>

      {/* Connection Times */}
      <section>
        <h4 className="text-green-400 font-semibold mb-2">Connection Times</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          {metrics.bootstrapFetchTime && (
            <div className="flex justify-between">
              <span>Bootstrap Fetch:</span>
              <span className="text-white">{formatTime(metrics.bootstrapFetchTime)}</span>
            </div>
          )}
          {metrics.streamConnectTime && (
            <div className="flex justify-between">
              <span>Stream Connect:</span>
              <span className="text-white">{formatTime(metrics.streamConnectTime)}</span>
            </div>
          )}
          {metrics.chatConnectTime && (
            <div className="flex justify-between">
              <span>Chat Connect:</span>
              <span className="text-white">{formatTime(metrics.chatConnectTime)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Session */}
      <section>
        <h4 className="text-purple-400 font-semibold mb-2">Session</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>Total Active Time:</span>
            <span className="text-white">{formatDuration(metrics.totalActiveTime)}</span>
          </div>
          <div className="flex justify-between">
            <span>Metrics Timestamp:</span>
            <span className="text-gray-400 text-xs">
              {metrics.timestamp.toLocaleString()}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
