/**
 * NetworkDebugTab Component
 * 
 * Displays network request log
 */

import type { NetworkRequest } from '@/lib/debug/types';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface NetworkDebugTabProps {
  requests: NetworkRequest[];
  onClear?: () => void;
}

export function NetworkDebugTab({ requests, onClear }: NetworkDebugTabProps) {
  const getStatusIcon = (request: NetworkRequest) => {
    if (request.error) return <XCircle className="w-4 h-4 text-red-500" />;
    if (request.status) {
      if (request.status >= 500) return <XCircle className="w-4 h-4 text-red-500" />;
      if (request.status >= 400) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-gray-500';
    if (status < 200) return 'text-yellow-500';
    if (status < 300) return 'text-green-500';
    if (status < 400) return 'text-yellow-500';
    if (status < 500) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  return (
    <div className="space-y-4" data-testid="debug-tab-network">
      {/* Summary */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-blue-400 font-semibold">Network Requests ({requests.length})</h4>
          {onClear && (
            <button
              onClick={onClear}
              className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-white"
              data-testid="btn-clear-network-log"
            >
              Clear
            </button>
          )}
        </div>
        <div className="text-xs text-gray-400">
          Failed: {requests.filter(r => r.status && r.status >= 400).length} / {requests.length}
        </div>
      </section>

      {/* Request List */}
      <section>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {requests.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">No requests logged yet</div>
          ) : (
            requests.slice().reverse().map((request) => (
              <div key={request.id} className="p-2 bg-gray-800 rounded text-xs">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(request)}
                  <span className="text-white font-mono font-semibold">{request.method}</span>
                  <span className="text-gray-400 truncate flex-1" title={request.url}>
                    {request.url}
                  </span>
                  {request.status && (
                    <span className={getStatusColor(request.status)}>
                      {request.status}
                    </span>
                  )}
                  {request.duration && (
                    <span className="text-gray-500">
                      {formatDuration(request.duration)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-400 mt-2">
                  <div>
                    <span className="text-gray-500">Type:</span> {request.type}
                  </div>
                  {request.size && (
                    <div>
                      <span className="text-gray-500">Size:</span> {formatSize(request.size)}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Time:</span>{' '}
                    {request.startTime.toLocaleTimeString()}
                  </div>
                  {request.error && (
                    <div className="text-red-400 col-span-2">
                      <span className="text-gray-500">Error:</span> {request.error}
                    </div>
                  )}
                </div>
                {request.responseBody && (
                  <details className="mt-2">
                    <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                      Response Body
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-900 rounded text-[10px] overflow-x-auto max-h-32 overflow-y-auto">
                      {typeof request.responseBody === 'string'
                        ? request.responseBody
                        : JSON.stringify(request.responseBody, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
