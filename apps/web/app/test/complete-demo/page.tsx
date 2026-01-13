'use client';

/**
 * Complete Demo/Test Page
 * 
 * Tests ALL features in one place:
 * - Chat (with email verification)
 * - Scoreboard (tap-to-edit)
 * - Collapsible panels
 * - Draggable panels in fullscreen
 * - Mobile responsive
 * - Translucent overlays
 * 
 * If it works here, it works everywhere!
 */

import { useState, useEffect, useRef } from 'react';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';
import { CollapsibleScoreboard } from '@/components/CollapsibleScoreboard';
import { CollapsibleChat } from '@/components/CollapsibleChat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

export default function CompleteDemoPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load test game
  useEffect(() => {
    async function loadTestGame() {
      try {
        const response = await fetch(`${API_URL}/api/direct/e2e-test/bootstrap`);
        const data = await response.json();
        
        if (data.gameId) {
          setGameId(data.gameId);
        } else {
          setError('No game available for testing.');
        }
      } catch (err) {
        setError(`Failed to load test game: ${err}`);
      } finally {
        setLoading(false);
      }
    }

    loadTestGame();
  }, []);

  // Fullscreen API handlers
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'escape':
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen]);

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

  // Score update handler
  const handleScoreUpdate = async (team: 'home' | 'away', newScore: number) => {
    if (!viewer.isUnlocked || !gameId) return;

    try {
      const response = await fetch(`${API_URL}/api/games/${gameId}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({
          homeScore: team === 'home' ? newScore : homeScore,
          awayScore: team === 'away' ? newScore : awayScore,
        }),
      });

      if (response.ok) {
        if (team === 'home') {
          setHomeScore(newScore);
        } else {
          setAwayScore(newScore);
        }
      }
    } catch (err) {
      console.error('Failed to update score:', err);
    }
  };

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
          <h1 className="text-3xl font-bold text-red-500">Test Setup Error</h1>
          <p className="text-gray-300 text-lg">{error}</p>
          <div className="bg-gray-800 rounded-lg p-6 text-left">
            <p className="text-white font-semibold mb-2">To fix this:</p>
            <code className="block bg-black text-green-400 p-4 rounded font-mono text-sm">
              cd apps/api && pnpm db:seed
            </code>
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
            <div className="text-center space-y-8 p-8">
              <div className="space-y-4">
                <h1 className="text-6xl md:text-8xl font-bold text-white drop-shadow-2xl">
                  🏈 Demo Game
                </h1>
                <p className="text-2xl md:text-3xl text-white/90 drop-shadow-lg">
                  Complete Feature Test
                </p>
              </div>

              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-3xl mx-auto space-y-6">
                {/* Features list */}
                <div className="text-white space-y-4">
                  <p className="text-xl font-semibold">✨ Testing All Features:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left text-sm md:text-base">
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">💬 Chat</span>
                      <p className="text-white/70 text-sm">Real-time messaging</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">📊 Scoreboard</span>
                      <p className="text-white/70 text-sm">Tap to edit scores</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">🔽 Collapsible</span>
                      <p className="text-white/70 text-sm">Hide to edges</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">🎯 Draggable</span>
                      <p className="text-white/70 text-sm">Move panels around</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">📱 Mobile</span>
                      <p className="text-white/70 text-sm">Touch-friendly</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <span className="font-semibold">✨ Translucent</span>
                      <p className="text-white/70 text-sm">See-through overlays</p>
                    </div>
                  </div>
                </div>

                {/* Keyboard shortcuts */}
                <div className="pt-4 border-t border-white/20">
                  <p className="text-white font-semibold mb-3">⌨️ Keyboard Shortcuts:</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <div className="bg-white/10 rounded-lg px-4 py-2">
                      <kbd className="px-3 py-1 bg-purple-600 rounded text-white font-mono font-bold">F</kbd>
                      <span className="ml-2 text-white/90">Fullscreen</span>
                    </div>
                    <div className="bg-white/10 rounded-lg px-4 py-2">
                      <kbd className="px-3 py-1 bg-red-600 rounded text-white font-mono font-bold">ESC</kbd>
                      <span className="ml-2 text-white/90">Exit</span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 justify-center pt-4">
                  <button
                    onClick={toggleFullscreen}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
                    data-testid="btn-toggle-fullscreen"
                  >
                    {isFullscreen ? '🗗 Exit Fullscreen' : '🗖 Go Fullscreen'}
                  </button>
                </div>

                {/* Connection info */}
                <div className="pt-4 border-t border-white/20">
                  <div className="flex flex-wrap items-center justify-center gap-4 text-white/70 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Game: {gameId?.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span>{chat.messages.length} messages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      <span>Score: {homeScore}-{awayScore}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-600/20 backdrop-blur-sm border-2 border-blue-400/50 rounded-xl p-4 max-w-2xl mx-auto">
                <p className="text-white text-sm md:text-base">
                  <strong>💡 Tip:</strong> Open this page in multiple browser windows or devices 
                  to test real-time chat sync. Tap scores to edit them!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Scoreboard (top-left) */}
      {isFullscreen && (
        <CollapsibleScoreboard
          homeTeam="Demo Home"
          awayTeam="Demo Away"
          homeScore={homeScore}
          awayScore={awayScore}
          homeColor="#3B82F6"
          awayColor="#EF4444"
          onScoreUpdate={handleScoreUpdate}
          canEdit={viewer.isUnlocked}
        />
      )}

      {/* Collapsible Chat (right side) */}
      {isFullscreen && (
        <CollapsibleChat
          chat={chat}
          viewerName={viewer.firstName || viewer.email || 'Viewer'}
        />
      )}

      {/* Desktop view (non-fullscreen) */}
      {!isFullscreen && (
        <div className="relative z-10 container mx-auto p-4 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scoreboard panel */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>📊</span> Scoreboard Demo
              </h2>
              <div className="bg-gray-900 rounded-lg p-6">
                <CollapsibleScoreboard
                  homeTeam="Demo Home"
                  awayTeam="Demo Away"
                  homeScore={homeScore}
                  awayScore={awayScore}
                  homeColor="#3B82F6"
                  awayColor="#EF4444"
                  onScoreUpdate={handleScoreUpdate}
                  canEdit={viewer.isUnlocked}
                />
              </div>
              <p className="text-white/70 text-sm">
                Tap the scores to edit them. Updates are sent in real-time.
              </p>
            </div>

            {/* Chat panel */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>💬</span> Chat Demo
              </h2>
              <div className="h-[500px]">
                <CollapsibleChat
                  chat={chat}
                  viewerName={viewer.firstName || viewer.email || 'Viewer'}
                />
              </div>
              <p className="text-white/70 text-sm">
                Messages sync in real-time. Open in multiple windows to test!
              </p>
            </div>
          </div>
        </div>
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

