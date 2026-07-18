'use client';

/**
 * Fullscreen Chat Overlay Demo
 * 
 * Showcases the translucent chat overlay on a fullscreen video player.
 * Press 'C' to toggle chat, 'F' for fullscreen.
 */

import { useState, useEffect, useRef } from 'react';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { FullscreenChatOverlay } from '@/components/FullscreenChatOverlay';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

export default function FullscreenChatTestPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Keyboard shortcut: F for fullscreen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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
        <p className="text-white">Loading test environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-500">Test Setup Error</h1>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  // Show unlock form if not unlocked
  if (!viewer.isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <ViewerUnlockForm
            onUnlock={viewer.unlock}
            isLoading={viewer.isLoading}
            error={viewer.error}
            title="Unlock Fullscreen Chat Demo"
            description="Enter your info to test the fullscreen chat overlay"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-black`}
      data-testid="fullscreen-container"
    >
      {/* Mock video player with sample content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Demo video background - gradient animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 animate-gradient-xy" />
        
        {/* Sample sports field overlay */}
        <div className="relative z-10 text-center space-y-8 p-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-white drop-shadow-2xl">
              🏈 Live Game
            </h1>
            <p className="text-2xl text-white/90 drop-shadow-lg">
              Fullscreen Chat Overlay Demo
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-8 max-w-2xl mx-auto space-y-4">
            <div className="text-white space-y-2">
              <p className="text-lg font-semibold">⌨️ Keyboard Shortcuts:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="bg-white/10 rounded-lg p-3">
                  <kbd className="px-3 py-1 bg-blue-600 rounded text-white font-mono font-bold">C</kbd>
                  <span className="ml-2 text-white/90">Toggle Chat</span>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <kbd className="px-3 py-1 bg-purple-600 rounded text-white font-mono font-bold">F</kbd>
                  <span className="ml-2 text-white/90">Fullscreen</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/20">
              <p className="text-white/80 text-sm">
                ✨ <strong>Features:</strong> Gradient opacity overlay, real-time messaging, 
                auto-scroll, keyboard shortcuts, mobile-optimized
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={toggleFullscreen}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                {isFullscreen ? '🗗 Exit Fullscreen' : '🗖 Go Fullscreen'}
              </button>
              <button
                onClick={() => setIsChatVisible(!isChatVisible)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                {isChatVisible ? '💬 Hide Chat' : '💬 Show Chat'}
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-4 text-white/70">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span>Game ID: {gameId?.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              <span>{chat.messages.length} messages</span>
            </div>
          </div>
        </div>

        {/* Fullscreen chat overlay */}
        <FullscreenChatOverlay
          chat={chat}
          isVisible={isChatVisible}
          onToggle={() => setIsChatVisible(!isChatVisible)}
          position="right"
        />
      </div>

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

