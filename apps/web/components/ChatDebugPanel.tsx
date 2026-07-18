'use client';

/**
 * ChatDebugPanel - Diagnostic panel for debugging chat registration issues
 * 
 * Shows all relevant state for troubleshooting:
 * - Bootstrap data (gameId, chatEnabled, etc.)
 * - Viewer identity state (isUnlocked, token, error)
 * - Chat connection state
 * - API endpoint status
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Bug, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

interface ChatDebugPanelProps {
  bootstrap: {
    slug?: string;
    gameId?: string | null;
    chatEnabled?: boolean;
    title?: string;
    paywallEnabled?: boolean;
  } | null;
  viewer: {
    isUnlocked: boolean;
    token: string | null;
    viewerId: string | null;
    isLoading: boolean;
    error: string | null;
  };
  chat: {
    isConnected: boolean;
    messages: unknown[];
    error?: string | null;
  };
  effectiveGameId: string | null;
}

interface ApiCheck {
  name: string;
  url: string;
  status: 'pending' | 'success' | 'error';
  response?: unknown;
  error?: string;
}

export function ChatDebugPanel({ bootstrap, viewer, chat, effectiveGameId }: ChatDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiChecks, setApiChecks] = useState<ApiCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Run API diagnostics
  const runDiagnostics = async () => {
    if (!bootstrap?.slug) return;
    
    setIsChecking(true);
    const checks: ApiCheck[] = [
      {
        name: 'Bootstrap Endpoint',
        url: `${API_URL}/api/direct/${bootstrap.slug}/bootstrap`,
        status: 'pending',
      },
      {
        name: 'Game Record Check',
        url: `${API_URL}/api/public/direct/${bootstrap.slug}/viewer/unlock`,
        status: 'pending',
      },
    ];
    
    setApiChecks(checks);

    // Check bootstrap
    try {
      const res = await fetch(checks[0].url);
      const data = await res.json();
      checks[0].status = res.ok ? 'success' : 'error';
      checks[0].response = {
        status: res.status,
        gameId: data.gameId,
        chatEnabled: data.chatEnabled,
        slug: data.slug,
      };
    } catch (err) {
      checks[0].status = 'error';
      checks[0].error = err instanceof Error ? err.message : 'Unknown error';
    }

    // Check viewer unlock endpoint (OPTIONS/dry-run style - just check if endpoint exists)
    try {
      const res = await fetch(checks[1].url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'diagnostic-test@example.com',
          firstName: 'Diagnostic',
          lastName: 'Test',
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        checks[1].status = 'success';
        checks[1].response = {
          status: res.status,
          hasToken: !!data.viewerToken,
          gameId: data.gameId,
        };
      } else {
        checks[1].status = 'error';
        checks[1].response = {
          status: res.status,
          error: data.error?.message || data.error || 'Unknown error',
        };
      }
    } catch (err) {
      checks[1].status = 'error';
      checks[1].error = err instanceof Error ? err.message : 'Unknown error';
    }

    setApiChecks([...checks]);
    setIsChecking(false);
  };

  // Status icon helper
  const StatusIcon = ({ status }: { status: 'pending' | 'success' | 'error' | boolean }) => {
    if (status === 'pending') return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
    if (status === 'success' || status === true) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  // Don't render in production unless explicitly enabled
  const showDebug = typeof window !== 'undefined' && (
    window.location.search.includes('debug=true') ||
    window.location.hostname === 'localhost' ||
    process.env.NODE_ENV === 'development'
  );

  if (!showDebug) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-md">
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
        Chat Debug
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl text-xs font-mono overflow-hidden">
          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <h3 className="text-yellow-400 font-bold flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Chat Registration Diagnostics
            </h3>
          </div>

          <div className="p-3 space-y-4 max-h-96 overflow-y-auto">
            {/* Bootstrap State */}
            <section>
              <h4 className="text-blue-400 font-semibold mb-2">📦 Bootstrap State</h4>
              <div className="space-y-1 text-gray-300">
                <div className="flex justify-between">
                  <span>Loaded:</span>
                  <StatusIcon status={!!bootstrap} />
                </div>
                <div className="flex justify-between">
                  <span>Slug:</span>
                  <span className="text-white">{bootstrap?.slug || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Game ID:</span>
                  <span className={cn('truncate max-w-[150px]', bootstrap?.gameId ? 'text-green-400' : 'text-red-400')}>
                    {bootstrap?.gameId || 'NULL ⚠️'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Chat Enabled:</span>
                  <StatusIcon status={bootstrap?.chatEnabled === true} />
                </div>
                <div className="flex justify-between">
                  <span>Paywall:</span>
                  <span className={bootstrap?.paywallEnabled ? 'text-yellow-400' : 'text-gray-500'}>
                    {bootstrap?.paywallEnabled ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Effective Game ID:</span>
                  <span className={cn('truncate max-w-[150px]', effectiveGameId ? 'text-green-400' : 'text-red-400')}>
                    {effectiveGameId || 'NULL ⚠️'}
                  </span>
                </div>
              </div>
            </section>

            {/* Viewer Identity State */}
            <section>
              <h4 className="text-purple-400 font-semibold mb-2">👤 Viewer Identity</h4>
              <div className="space-y-1 text-gray-300">
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
                  <span className="truncate max-w-[150px] text-white">
                    {viewer.viewerId || '—'}
                  </span>
                </div>
                {viewer.error && (
                  <div className="mt-2 p-2 bg-red-900/50 rounded text-red-300">
                    <strong>Error:</strong> {viewer.error}
                  </div>
                )}
              </div>
            </section>

            {/* Chat State */}
            <section>
              <h4 className="text-green-400 font-semibold mb-2">💬 Chat State</h4>
              <div className="space-y-1 text-gray-300">
                <div className="flex justify-between">
                  <span>Connected:</span>
                  <StatusIcon status={chat.isConnected} />
                </div>
                <div className="flex justify-between">
                  <span>Messages:</span>
                  <span className="text-white">{chat.messages?.length || 0}</span>
                </div>
                {chat.error && (
                  <div className="mt-2 p-2 bg-red-900/50 rounded text-red-300">
                    <strong>Error:</strong> {chat.error}
                  </div>
                )}
              </div>
            </section>

            {/* API Checks */}
            <section>
              <h4 className="text-orange-400 font-semibold mb-2">🔌 API Checks</h4>
              <button
                onClick={runDiagnostics}
                disabled={isChecking || !bootstrap?.slug}
                className={cn(
                  'w-full py-2 px-3 rounded text-sm font-medium',
                  'bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700',
                  'text-white disabled:text-gray-400 transition-colors'
                )}
                data-testid="btn-run-diagnostics"
              >
                {isChecking ? 'Checking...' : 'Run API Diagnostics'}
              </button>
              
              {apiChecks.length > 0 && (
                <div className="mt-2 space-y-2">
                  {apiChecks.map((check, i) => (
                    <div key={i} className="p-2 bg-gray-800 rounded">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={check.status} />
                        <span className="text-white">{check.name}</span>
                      </div>
                      {check.response !== undefined && (
                        <pre className="mt-1 text-[10px] text-gray-400 overflow-x-auto">
                          {JSON.stringify(check.response, null, 2)}
                        </pre>
                      )}
                      {check.error && (
                        <div className="mt-1 text-red-400 text-[10px]">
                          {check.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section>
              <h4 className="text-cyan-400 font-semibold mb-2">⚡ Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    localStorage.removeItem('fieldview_viewer_identity');
                    window.location.reload();
                  }}
                  className="w-full py-2 px-3 rounded text-sm bg-red-600 hover:bg-red-500 text-white"
                  data-testid="btn-clear-identity"
                >
                  Clear Viewer Identity & Reload
                </button>
                <button
                  onClick={() => {
                    console.log('=== CHAT DEBUG STATE ===');
                    console.log('Bootstrap:', bootstrap);
                    console.log('Viewer:', viewer);
                    console.log('Chat:', chat);
                    console.log('Effective Game ID:', effectiveGameId);
                    console.log('========================');
                  }}
                  className="w-full py-2 px-3 rounded text-sm bg-gray-600 hover:bg-gray-500 text-white"
                  data-testid="btn-log-state"
                >
                  Log State to Console
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
