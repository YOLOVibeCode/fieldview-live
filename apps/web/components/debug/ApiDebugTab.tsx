/**
 * ApiDebugTab Component
 * 
 * Displays API endpoint health information
 */

import type { ApiHealthInfo } from '@/lib/debug/types';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ApiDebugTabProps {
  health: ApiHealthInfo;
  onCheckEndpoint?: (name: keyof ApiHealthInfo['endpoints'], url: string) => void;
}

export function ApiDebugTab({ health, onCheckEndpoint }: ApiDebugTabProps) {
  const StatusIcon = ({ healthy }: { healthy: boolean }) => {
    if (healthy) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-gray-500';
    if (status < 200) return 'text-yellow-500';
    if (status < 300) return 'text-green-500';
    if (status < 400) return 'text-yellow-500';
    if (status < 500) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatLatency = (ms: number) => {
    if (ms < 100) return `${ms}ms`;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-4" data-testid="debug-tab-api">
      {/* Overall Health */}
      <section>
        <h4 className="text-blue-400 font-semibold mb-2">Overall Health</h4>
        <div className="flex items-center gap-2">
          {health.overallHealth === 'healthy' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {health.overallHealth === 'degraded' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
          {health.overallHealth === 'unhealthy' && <XCircle className="w-5 h-5 text-red-500" />}
          <span className="text-white font-semibold uppercase">{health.overallHealth}</span>
        </div>
      </section>

      {/* Endpoints */}
      <section>
        <h4 className="text-green-400 font-semibold mb-2">Endpoints</h4>
        <div className="space-y-2">
          {Object.entries(health.endpoints).map(([name, endpoint]) => (
            <div key={name} className="p-2 bg-gray-800 rounded">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <StatusIcon healthy={endpoint.isHealthy} />
                  <span className="text-white font-semibold capitalize">{name}</span>
                </div>
                {onCheckEndpoint && (
                  <button
                    onClick={() => onCheckEndpoint(name as keyof ApiHealthInfo['endpoints'], endpoint.url)}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white"
                    data-testid={`btn-check-${name}`}
                  >
                    Check
                  </button>
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>URL:</span>
                  <span className="text-gray-400 truncate max-w-[200px]" title={endpoint.url}>
                    {endpoint.url}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={getStatusColor(endpoint.lastStatus)}>
                    {endpoint.lastStatus > 0 ? `${endpoint.lastStatus}` : 'Not checked'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Latency:</span>
                  <span className="text-white">
                    {endpoint.lastLatency > 0 ? formatLatency(endpoint.lastLatency) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Latency:</span>
                  <span className="text-white">
                    {endpoint.avgLatency > 0 ? formatLatency(endpoint.avgLatency) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate:</span>
                  <span className={endpoint.errorRate > 0 ? 'text-red-400' : 'text-green-400'}>
                    {endpoint.errorRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Requests:</span>
                  <span className="text-white">
                    {endpoint.successCount}/{endpoint.requestCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Checked:</span>
                  <span className="text-gray-400 text-[10px]">
                    {endpoint.lastChecked.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
