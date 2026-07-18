/**
 * StreamDebugTab Component
 * 
 * Displays HLS player debug information
 */

import type { StreamDebugInfo } from '@/lib/debug/types';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface StreamDebugTabProps {
  debugInfo: StreamDebugInfo;
}

export function StreamDebugTab({ debugInfo }: StreamDebugTabProps) {
  const StatusIcon = ({ state }: { state: StreamDebugInfo['playerState'] }) => {
    switch (state) {
      case 'playing':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'loading':
      case 'buffering':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatBitrate = (bps: number) => {
    if (bps < 1000) return `${bps} bps`;
    if (bps < 1000000) return `${(bps / 1000).toFixed(1)} kbps`;
    return `${(bps / 1000000).toFixed(2)} Mbps`;
  };

  return (
    <div className="space-y-4" data-testid="debug-tab-stream">
      {/* Player State */}
      <section>
        <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
          <StatusIcon state={debugInfo.playerState} />
          Player State
        </h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>State:</span>
            <span className="text-white font-mono uppercase">{debugInfo.playerState}</span>
          </div>
          <div className="flex justify-between">
            <span>HLS Version:</span>
            <span className="text-white">{debugInfo.hlsVersion}</span>
          </div>
          <div className="flex justify-between">
            <span>Stream Type:</span>
            <span className="text-white">{debugInfo.isLive ? 'LIVE' : 'VOD'}</span>
          </div>
        </div>
      </section>

      {/* Quality */}
      <section>
        <h4 className="text-green-400 font-semibold mb-2">Quality</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>Current Level:</span>
            <span className="text-white">{debugInfo.currentLevel >= 0 ? debugInfo.currentLevel : 'Auto'}</span>
          </div>
          <div className="flex justify-between">
            <span>Current Bitrate:</span>
            <span className="text-white">{formatBitrate(debugInfo.currentBitrate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Auto Level:</span>
            <span className={debugInfo.autoLevelEnabled ? 'text-green-400' : 'text-gray-500'}>
              {debugInfo.autoLevelEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {debugInfo.availableLevels.length > 0 && (
            <div className="mt-2">
              <span className="text-gray-400 text-xs">Available Levels:</span>
              <div className="mt-1 space-y-1">
                {debugInfo.availableLevels.map((level, i) => (
                  <div key={i} className="text-xs text-gray-500">
                    {level.resolution} @ {formatBitrate(level.bitrate)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Buffer */}
      <section>
        <h4 className="text-yellow-400 font-semibold mb-2">Buffer</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>Buffer Length:</span>
            <span className="text-white">{debugInfo.bufferLength.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Back Buffer:</span>
            <span className="text-white">{debugInfo.backBufferLength.toFixed(1)}s</span>
          </div>
        </div>
      </section>

      {/* Performance */}
      <section>
        <h4 className="text-purple-400 font-semibold mb-2">Performance</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>Time to First Frame:</span>
            <span className="text-white">{debugInfo.timeToFirstFrame > 0 ? `${debugInfo.timeToFirstFrame}ms` : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Dropped Frames:</span>
            <span className="text-white">{debugInfo.droppedFrames}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Frames:</span>
            <span className="text-white">{debugInfo.totalFrames}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Segment Load:</span>
            <span className="text-white">{debugInfo.lastSegmentLoadTime > 0 ? `${debugInfo.lastSegmentLoadTime}ms` : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Bandwidth Estimate:</span>
            <span className="text-white">{debugInfo.bandwidth > 0 ? formatBitrate(debugInfo.bandwidth) : 'N/A'}</span>
          </div>
        </div>
      </section>

      {/* Network */}
      <section>
        <h4 className="text-cyan-400 font-semibold mb-2">Network</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>Stream URL:</span>
            <span className="text-white text-xs truncate max-w-[200px]" title={debugInfo.streamUrl}>
              {debugInfo.streamUrl || 'Not set'}
            </span>
          </div>
        </div>
      </section>

      {/* Errors */}
      {debugInfo.lastError && (
        <section>
          <h4 className="text-red-400 font-semibold mb-2">Last Error</h4>
          <div className="p-2 bg-red-900/50 rounded text-red-300 text-xs">
            <div className="font-semibold">{debugInfo.lastError.type} {debugInfo.lastError.fatal ? '(Fatal)' : ''}</div>
            <div className="mt-1">{debugInfo.lastError.details}</div>
            <div className="mt-1 text-gray-400">
              {new Date(debugInfo.lastError.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </section>
      )}

      {debugInfo.errorHistory.length > 0 && (
        <section>
          <h4 className="text-orange-400 font-semibold mb-2">Error History ({debugInfo.errorHistory.length})</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {debugInfo.errorHistory.map((error, i) => (
              <div key={i} className="p-1 bg-gray-800 rounded text-xs text-gray-400">
                <div className="font-semibold">{error.type}</div>
                <div className="text-gray-500">{error.message}</div>
                <div className="text-gray-600 text-[10px]">
                  {new Date(error.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
