'use client';

/**
 * Complete Demo/Test Page
 * 
 * Tests ALL features in one place:
 * - Chat (with email verification)
 * - Scoreboard (tap-to-edit with collapsible, draggable)
 * - Fullscreen mode
 * - Mobile responsive controls
 * - Translucent overlays
 * 
 * If it works here, it works everywhere!
 * This uses the EXACT same components as DirectStreamPageBase.
 */

import { useState, useEffect, useRef } from 'react';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';
import { FullscreenChatOverlay } from '@/components/FullscreenChatOverlay';
import { CollapsibleScoreboardOverlay } from '@/components/CollapsibleScoreboardOverlay';
import { MobileControlBar } from '@/components/MobileControlBar';
import { GameChatPanel } from '@/components/GameChatPanel';
import { useCollapsiblePanel } from '@/hooks/useCollapsiblePanel';
import { isTouchDevice } from '@/lib/utils/device-detection';
import { hashSlugSync } from '@/lib/hashSlug';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

export default function CompleteDemoPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOverlayVisible, setIsChatOverlayVisible] = useState(false);
  const [isScoreboardOverlayVisible, setIsScoreboardOverlayVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const chatPanel = useCollapsiblePanel('demo-chat', false);
  const scoreboardPanel = useCollapsiblePanel('demo-scoreboard', false);

  // Load demo using TCHS stream
  useEffect(() => {
    async function loadDemoGame() {
      try {
        // Use TCHS stream for demo - it has all features enabled
        // This generates a consistent game ID based on the slug
        const demoGameId = hashSlugSync('tchs');
        setGameId(demoGameId);
        setLoading(false);
      } catch (err) {
        setError(`Failed to initialize demo: ${err}`);
        setLoading(false);
      }
    }

    loadDemoGame();
  }, []);

  // Fullscreen API handlers
  useEffect(() => {
    const handleFullscreenChange = () => {
      const newIsFullscreen = !!document.fullscreenElement;
      setIsFullscreen(newIsFullscreen);
      
      // Show scoreboard by default in fullscreen
      if (newIsFullscreen) {
        setIsScoreboardOverlayVisible(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  const viewer = useViewerIdentity({ gameId });
  const chat = useGameChat({
    gameId,
    viewerToken: viewer.token,
    enabled: viewer.isUnlocked && gameId !== null,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-pulse">🎬</div>
          <p className="text-white text-xl">Loading demo environment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center space-y-4 max-w-2xl">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-3xl font-bold text-red-500">Demo Initialization Error</h1>
          <p className="text-gray-300 text-lg">{error}</p>
          <div className="bg-gray-800 rounded-lg p-6 text-left">
            <p className="text-white font-semibold mb-2">This demo uses the TCHS stream for testing.</p>
            <p className="text-gray-400 text-sm">Make sure the TCHS stream is configured in the database.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show unlock form if not unlocked
  if (!viewer.isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-4xl font-bold text-white mb-2">Complete Feature Demo</h1>
            <p className="text-white/80">Test ALL features in one place!</p>
          </div>
          <ViewerUnlockForm
            onUnlock={viewer.unlock}
            isLoading={viewer.isLoading}
            error={viewer.error}
            title="Register to Access Demo"
            description="Enter your email to test chat, scoreboard, and all features"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-black relative`}
      data-testid="demo-container"
    >
      {/* Background video simulation */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 animate-gradient-xy">
          {/* Field overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-8 p-4 md:p-8 max-w-5xl">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold text-white drop-shadow-2xl">
                  ⚽ Live Demo Game
                </h1>
                <p className="text-xl md:text-2xl lg:text-3xl text-white/90 drop-shadow-lg">
                  Complete Feature Test
                </p>
              </div>

              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
                {/* Features list */}
                <div className="text-white space-y-4">
                  <p className="text-lg md:text-xl font-semibold">✨ Testing All Features:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-left text-sm md:text-base">
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">💬 Chat</span>
                      <p className="text-white/70 text-xs md:text-sm">Real-time messaging</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">📊 Scoreboard</span>
                      <p className="text-white/70 text-xs md:text-sm">Tap-to-edit scores</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">🎯 Collapsible</span>
                      <p className="text-white/70 text-xs md:text-sm">Hide/show panels</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">🖐️ Draggable</span>
                      <p className="text-white/70 text-xs md:text-sm">Move panels around</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">📱 Mobile</span>
                      <p className="text-white/70 text-xs md:text-sm">Touch-friendly controls</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">💎 Translucent</span>
                      <p className="text-white/70 text-xs md:text-sm">See-through overlays</p>
                    </div>
                  </div>
                </div>

                {/* Keyboard shortcuts */}
                <div className="pt-4 border-t border-white/20">
                  <p className="text-white font-semibold mb-3 text-sm md:text-base">⌨️ Keyboard Shortcuts:</p>
                  <div className="flex flex-wrap gap-2 md:gap-3 justify-center text-xs md:text-sm">
                    <div className="bg-white/10 rounded-lg px-3 py-2">
                      <kbd className="px-2 md:px-3 py-1 bg-purple-600 rounded text-white font-mono font-bold">F</kbd>
                      <span className="ml-2 text-white/90">Fullscreen</span>
                    </div>
                    <div className="bg-white/10 rounded-lg px-3 py-2">
                      <kbd className="px-2 md:px-3 py-1 bg-red-600 rounded text-white font-mono font-bold">ESC</kbd>
                      <span className="ml-2 text-white/90">Exit</span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 justify-center pt-4">
                  <button
                    onClick={toggleFullscreen}
                    className="px-4 md:px-6 py-2 md:py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg text-sm md:text-base"
                    data-testid="btn-toggle-fullscreen"
                  >
                    {isFullscreen ? '🗗 Exit Fullscreen' : '🗖 Go Fullscreen'}
                  </button>
                  {!isFullscreen && (
                    <>
                      <button
                        onClick={() => setIsChatOverlayVisible(!isChatOverlayVisible)}
                        className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg text-sm md:text-base"
                        data-testid="btn-toggle-chat"
                      >
                        {isChatOverlayVisible ? '💬 Hide Chat' : '💬 Show Chat'}
                      </button>
                      <button
                        onClick={() => setIsScoreboardOverlayVisible(!isScoreboardOverlayVisible)}
                        className="px-4 md:px-6 py-2 md:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-lg text-sm md:text-base"
                        data-testid="btn-toggle-scoreboard"
                      >
                        {isScoreboardOverlayVisible ? '📊 Hide Scoreboard' : '📊 Show Scoreboard'}
                      </button>
                    </>
                  )}
                </div>

                {/* Connection info */}
                <div className="pt-4 border-t border-white/20">
                  <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-white/70 text-xs md:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-mono">{gameId?.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span>{chat.messages.length} messages</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-600/20 backdrop-blur-sm border-2 border-blue-400/50 rounded-xl p-3 md:p-4">
                <p className="text-white text-xs md:text-sm lg:text-base">
                  <strong>💡 Tip:</strong> Open this page in multiple browser windows or devices 
                  to test real-time chat sync. In fullscreen, click scores to edit them!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Scoreboard Overlay */}
      {isFullscreen && isScoreboardOverlayVisible && gameId && (
        <CollapsibleScoreboardOverlay
          gameId={gameId}
          isOpen={!scoreboardPanel.isCollapsed}
          onToggle={scoreboardPanel.toggle}
          viewerToken={viewer.token || ''}
        />
      )}

      {/* Fullscreen Chat Overlay */}
      {isFullscreen && isChatOverlayVisible && (
        <FullscreenChatOverlay
          chat={chat}
          isOpen={!chatPanel.isCollapsed}
          onToggle={chatPanel.toggle}
          viewerName={viewer.firstName || viewer.email || 'Anonymous'}
        />
      )}

      {/* Desktop view - Side-by-side chat panel (non-fullscreen) */}
      {!isFullscreen && isChatOverlayVisible && (
        <div className="fixed right-4 top-4 bottom-4 w-80 md:w-96 z-30">
          <div className="h-full bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-2xl overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span>💬</span>
                  <span>Live Chat</span>
                  <span className="text-xs text-gray-400">({chat.messages.length})</span>
                </h3>
                <button
                  onClick={() => setIsChatOverlayVisible(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close chat"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <GameChatPanel chat={chat} className="h-full" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Control Bar (fullscreen only) */}
      {isFullscreen && isTouchDevice() && (
        <MobileControlBar
          onToggleFullscreen={toggleFullscreen}
          onToggleChat={() => setIsChatOverlayVisible(!isChatOverlayVisible)}
          onToggleScoreboard={() => setIsScoreboardOverlayVisible(!isScoreboardOverlayVisible)}
          isChatVisible={isChatOverlayVisible}
          isScoreboardVisible={isScoreboardOverlayVisible}
        />
      )}

      <style jsx global>{`
        @keyframes gradient-xy {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 15s ease infinite;
        }
      `}</style>
    </div>
  );
}
