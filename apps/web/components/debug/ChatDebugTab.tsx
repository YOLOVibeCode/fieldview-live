/**
 * ChatDebugTab Component
 * 
 * Displays chat/SSE connection debug information
 */

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ChatDebugTabProps {
  chat: {
    isConnected: boolean;
    messages?: unknown[];
    messageCount?: number;
    error?: string | null;
    transport?: string;
    gameId?: string;
  };
  viewer: {
    isUnlocked: boolean;
    token: string | null;
    viewerId: string | null;
    isLoading: boolean;
    error: string | null;
  };
  effectiveGameId: string | null;
}

export function ChatDebugTab({ chat, viewer, effectiveGameId }: ChatDebugTabProps) {
  const StatusIcon = ({ status }: { status: boolean }) => {
    if (status) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-4" data-testid="debug-tab-chat">
      {/* Chat State */}
      <section>
        <h4 className="text-green-400 font-semibold mb-2">💬 Chat State</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>Connected:</span>
            <StatusIcon status={chat.isConnected} />
          </div>
          <div className="flex justify-between">
            <span>Transport:</span>
            <span className="text-white">{chat.transport || 'SSE'}</span>
          </div>
          <div className="flex justify-between">
            <span>Messages:</span>
            <span className="text-white">{chat.messageCount ?? chat.messages?.length ?? 0}</span>
          </div>
          {chat.gameId && (
            <div className="flex justify-between">
              <span>Game ID:</span>
              <span className="text-white text-xs truncate max-w-[200px]" title={chat.gameId}>
                {chat.gameId}
              </span>
            </div>
          )}
          {chat.error && (
            <div className="mt-2 p-2 bg-red-900/50 rounded text-red-300 text-xs">
              <strong>Error:</strong> {chat.error}
            </div>
          )}
        </div>
      </section>

      {/* Viewer Identity */}
      <section>
        <h4 className="text-purple-400 font-semibold mb-2">👤 Viewer Identity</h4>
        <div className="space-y-1 text-gray-300 text-sm">
          <div className="flex justify-between">
            <span>Unlocked:</span>
            <StatusIcon status={viewer.isUnlocked} />
          </div>
          <div className="flex justify-between">
            <span>Loading:</span>
            <span className={viewer.isLoading ? 'text-yellow-400' : 'text-gray-500'}>
              {viewer.isLoading ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Has Token:</span>
            <StatusIcon status={!!viewer.token} />
          </div>
          <div className="flex justify-between">
            <span>Viewer ID:</span>
            <span className="text-white text-xs truncate max-w-[200px]">
              {viewer.viewerId || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Effective Game ID:</span>
            <span className={effectiveGameId ? 'text-green-400' : 'text-red-400'}>
              {effectiveGameId || 'NULL ⚠️'}
            </span>
          </div>
          {viewer.error && (
            <div className="mt-2 p-2 bg-red-900/50 rounded text-red-300 text-xs">
              <strong>Error:</strong> {viewer.error}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
