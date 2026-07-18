/**
 * ConnectionDebugPanel Component
 * 
 * Unified debug panel for all connection types (stream, API, chat, network, metrics)
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Bug, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StreamDebugTab } from './StreamDebugTab';
import { ApiDebugTab } from './ApiDebugTab';
import { ChatDebugTab } from './ChatDebugTab';
import { NetworkDebugTab } from './NetworkDebugTab';
import { MetricsDebugTab } from './MetricsDebugTab';
import type { StreamDebugInfo, ApiHealthInfo, NetworkRequest, DebugMetrics } from '@/lib/debug/types';
import { generateDebugReport, exportDebugReport } from '@/lib/debug/reportExporter';
import { getCapturedErrors } from '@/lib/debug/consoleCapture';
import { useNetworkLog } from '@/hooks/useNetworkLog';

type Tab = 'stream' | 'api' | 'chat' | 'network' | 'metrics';

interface ConnectionDebugPanelProps {
  stream?: StreamDebugInfo;
  api?: ApiHealthInfo;
  chat?: {
    isConnected: boolean;
    messages?: unknown[];
    messageCount?: number;
    error?: string | null;
    transport?: string;
    gameId?: string;
  };
  viewer?: {
    isUnlocked: boolean;
    token: string | null;
    viewerId: string | null;
    isLoading: boolean;
    error: string | null;
  };
  effectiveGameId?: string | null;
  metrics: DebugMetrics;
  slug?: string;
  onCheckEndpoint?: (name: keyof ApiHealthInfo['endpoints'], url: string) => void;
}

export function ConnectionDebugPanel({
  stream,
  api,
  chat,
  viewer,
  effectiveGameId,
  metrics,
  slug,
  onCheckEndpoint,
}: ConnectionDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('stream');
  const { log: networkLog, clear: clearNetworkLog } = useNetworkLog();

  // Check if debug mode is enabled
  const showDebug = typeof window !== 'undefined' && (
    window.location.search.includes('debug=true') ||
    window.location.hostname === 'localhost' ||
    process.env.NODE_ENV === 'development'
  );

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    if (!showDebug) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDebug]);

  const handleExport = () => {
    const report = generateDebugReport({
      stream,
      api,
      chat: chat ? {
        connected: chat.isConnected,
        transport: chat.transport || 'SSE',
        messageCount: chat.messageCount ?? chat.messages?.length ?? 0,
        gameId: chat.gameId,
      } : undefined,
      networkLog,
      consoleErrors: getCapturedErrors(),
      metrics,
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    });
    exportDebugReport(report);
  };

  if (!showDebug) return null;

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'stream', label: 'Stream', icon: '📡' },
    { id: 'api', label: 'API', icon: '🔌' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'network', label: 'Network', icon: '🌐' },
    { id: 'metrics', label: 'Metrics', icon: '📊' },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-2xl w-full max-h-[80vh]" data-testid="debug-panel">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg',
          'bg-yellow-500 text-black font-medium text-sm',
          'hover:bg-yellow-400 transition-colors'
        )}
        data-testid="btn-debug-toggle"
      >
        <Bug className="w-4 h-4" />
        Connection Debug
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl text-xs font-mono overflow-hidden flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="p-3 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
            <h3 className="text-yellow-400 font-bold flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Connection Diagnostics
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-white text-xs flex items-center gap-1"
                data-testid="btn-export-debug"
                title="Export debug report"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-700 rounded"
                data-testid="btn-close-debug"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="p-2 border-b border-gray-700 bg-gray-800 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span>📡</span>
              <span className={stream?.playerState === 'playing' ? 'text-green-400' : stream?.playerState === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                {stream?.playerState?.toUpperCase() || 'IDLE'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>🔌</span>
              <span className={api?.overallHealth === 'healthy' ? 'text-green-400' : api?.overallHealth === 'unhealthy' ? 'text-red-400' : 'text-yellow-400'}>
                {api?.overallHealth?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>💬</span>
              <span className={chat?.isConnected ? 'text-green-400' : 'text-red-400'}>
                {chat?.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 bg-gray-800 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-gray-900 text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                )}
                data-testid={`debug-tab-${tab.id}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 overflow-y-auto flex-1">
            {activeTab === 'stream' && stream && <StreamDebugTab debugInfo={stream} />}
            {activeTab === 'api' && api && <ApiDebugTab health={api} onCheckEndpoint={onCheckEndpoint} />}
            {activeTab === 'chat' && chat && viewer && (
              <ChatDebugTab chat={chat} viewer={viewer} effectiveGameId={effectiveGameId || null} />
            )}
            {activeTab === 'network' && <NetworkDebugTab requests={networkLog} onClear={clearNetworkLog} />}
            {activeTab === 'metrics' && <MetricsDebugTab metrics={metrics} />}
          </div>
        </div>
      )}
    </div>
  );
}
