'use client';

/**
 * TCHS Dynamic Stream Page with Chat
 * 
 * Handles date/team-specific streams like:
 * - /direct/tchs/20260106/SoccerJV
 * - /direct/tchs/20260106/SoccerVarsity
 * 
 * Features:
 * - Mobile-first responsive layout
 * - Real-time chat integration
 * - Touch-friendly controls
 * - Font size scaling
 * - Viewer identity management
 */

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { GameChatPanel } from '@/components/GameChatPanel';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';
import { TchsFullscreenChatOverlay } from '@/components/TchsFullscreenChatOverlay';
import { buildTchsStreamKey } from '@/lib/tchs-stream-key';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_TCHS_ADMIN_PASSWORD || 'tchs2026';

interface Bootstrap {
  slug: string;
  gameId: string | null;
  streamUrl: string | null;
  chatEnabled: boolean;
  title: string;
}

type FontSize = 'small' | 'medium' | 'large';

export default function DirectTchsTeamPage({
  params,
}: {
  params: { date: string; team: string };
}) {
  const streamKey = buildTchsStreamKey({ date: params.date, team: params.team });
  const sharePath = `fieldview.live/direct/tchs/${params.date}/${params.team}`;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'offline' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [isChatOverlayVisible, setIsChatOverlayVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load font size preference
  useEffect(() => {
    const saved = localStorage.getItem('tchs_chat_font_size');
    if (saved === 'small' || saved === 'medium' || saved === 'large') {
      setFontSize(saved);
    }
  }, []);

  // Save font size preference
  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem('tchs_chat_font_size', size);
  };

  // Load bootstrap data
  useEffect(() => {
    fetch(`${API_URL}/api/tchs/${streamKey}/bootstrap`)
      .then((res) => res.json())
      .then((data) => {
        setBootstrap(data);
        if (data.streamUrl) {
          setInputUrl(data.streamUrl);
          initPlayer(data.streamUrl);
        } else {
          setStatus('offline');
        }
      })
      .catch(() => setStatus('offline'));
  }, [streamKey]);

  // Chat integration
  const viewer = useViewerIdentity({ gameId: bootstrap?.gameId || null });
  const chat = useGameChat({
    gameId: bootstrap?.gameId || null,
    viewerToken: viewer.token,
    enabled: viewer.isUnlocked && bootstrap?.chatEnabled === true,
  });

  // Fullscreen API detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcut: F for fullscreen toggle
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.key === 'f' || e.key === 'F') && status === 'playing') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [status]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsChatOverlayVisible(true); // Show chat overlay in fullscreen
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  function initPlayer(url: string) {
    const video = videoRef.current;
    if (!video || !url) {
      setStatus('offline');
      return;
    }

    setStatus('loading');

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('playing');
        video.play().catch(() => {
          // Autoplay blocked
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setStatus('error');
        }
      });

      return () => hls.destroy();
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setStatus('playing');
        void video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setStatus('error');
      });
      return;
    }

    setStatus('error');
  }

  async function handleUpdateStream(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/tchs/${streamKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl: inputUrl,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update stream' }));
        throw new Error(error.error || 'Update failed');
      }

      setMessage('✓ Stream updated successfully!');
      setIsEditing(false);
      
      // Reload the stream
      if (inputUrl) {
        initPlayer(inputUrl);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleClearStream(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/tchs/${streamKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl: '', // Empty string clears the stream
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to clear stream' }));
        throw new Error(error.error || 'Clear failed');
      }

      setMessage('✓ Stream cleared successfully!');
      setInputUrl('');
      setStatus('offline');
      
      // Clear the player
      const video = videoRef.current;
      if (video) {
        video.src = '';
        video.load();
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header - Collapsible on mobile */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 py-2 sm:px-4 sm:py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">
              TCHS Live Stream
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 truncate">
              {params.team} • {params.date}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {sharePath}
            </p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="ml-2 px-3 py-2 sm:px-4 bg-gray-800 text-white text-sm sm:text-base rounded hover:bg-gray-700 transition active:scale-95 min-h-[44px] flex items-center justify-center"
            aria-label={isEditing ? 'Close Admin Panel' : 'Open Admin Panel'}
          >
            {isEditing ? 'Close' : 'Admin'}
          </button>
        </div>
      </div>

      {/* Admin Panel */}
      {isEditing && (
        <div className="bg-gray-900 border-b border-gray-800 px-3 py-3 sm:px-4 sm:py-4">
          <div className="max-w-screen-2xl mx-auto">
            <form onSubmit={handleUpdateStream} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Stream URL (HLS .m3u8)
                </label>
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://example.com/stream.m3u8"
                  className="w-full px-3 py-2 min-h-[44px] text-base bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-3 py-2 min-h-[44px] text-base bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {message && (
                <div className={`text-sm ${message.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                  {message}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 min-h-[44px] bg-blue-600 text-white text-base font-medium rounded hover:bg-blue-700 transition active:scale-95"
                >
                  Update Stream
                </button>
                {inputUrl && (
                  <button
                    type="button"
                    onClick={handleClearStream}
                    className="px-6 py-3 min-h-[44px] bg-red-600 text-white text-base font-medium rounded hover:bg-red-700 transition active:scale-95"
                    aria-label="Clear stream"
                  >
                    Clear Stream
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Font Size Controls - Mobile & Desktop */}
      {bootstrap?.chatEnabled && bootstrap.gameId && viewer.isUnlocked && (
        <div className="bg-gray-900 border-b border-gray-800 px-3 py-2 sm:px-4">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-400">Chat Text Size:</span>
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={() => handleFontSizeChange('small')}
                className={`px-3 py-1.5 min-h-[36px] sm:min-h-[40px] rounded text-sm transition active:scale-95 ${
                  fontSize === 'small'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                aria-label="Small text size"
              >
                A−
              </button>
              <button
                onClick={() => handleFontSizeChange('medium')}
                className={`px-3 py-1.5 min-h-[36px] sm:min-h-[40px] rounded text-base transition active:scale-95 ${
                  fontSize === 'medium'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                aria-label="Medium text size"
              >
                A
              </button>
              <button
                onClick={() => handleFontSizeChange('large')}
                className={`px-3 py-1.5 min-h-[36px] sm:min-h-[40px] rounded text-lg transition active:scale-95 ${
                  fontSize === 'large'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                aria-label="Large text size"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Responsive Layout */}
      <div ref={containerRef} className="max-w-screen-2xl mx-auto p-2 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 min-h-[calc(100vh-180px)] sm:min-h-[calc(100vh-200px)]">
          
          {/* Video Player - Mobile: Full width, Tablet: 70%, Desktop: 80% */}
          <div className="w-full lg:flex-[7] xl:flex-[4] flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden aspect-video lg:aspect-auto lg:min-h-[500px] relative">
            {status === 'offline' && (
              <div className="text-center text-gray-400 p-4 sm:p-8">
                <p className="text-base sm:text-lg">Stream is offline</p>
                <p className="text-sm mt-2">Waiting for stream to start...</p>
              </div>
            )}
            {status === 'error' && (
              <div className="text-center text-red-400 p-4 sm:p-8">
                <p className="text-base sm:text-lg">Error loading stream</p>
                <p className="text-sm mt-2">Please check the stream URL</p>
              </div>
            )}
            {status === 'loading' && (
              <div className="text-center text-gray-400 p-4 sm:p-8">
                <p className="text-base sm:text-lg">Loading stream...</p>
              </div>
            )}
            <video
              ref={videoRef}
              className={`${status === 'playing' ? 'block' : 'hidden'} w-full h-full object-contain`}
              controls
              playsInline
              data-testid="video-player"
            />
            
            {/* Fullscreen button overlay */}
            {status === 'playing' && !isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="absolute bottom-4 right-4 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg text-sm font-medium backdrop-blur-sm transition-all active:scale-95"
                aria-label="Enter fullscreen"
              >
                🗖 Fullscreen
              </button>
            )}
          </div>

          {/* Chat Sidebar - Mobile: Below video, Tablet: 30%, Desktop: 20% */}
          <div 
            className="w-full lg:flex-[3] xl:flex-1 lg:min-w-[280px] xl:min-w-[300px] flex flex-col"
            data-font-size={fontSize}
          >
            {bootstrap?.chatEnabled && bootstrap.gameId ? (
              <>
                {!viewer.isUnlocked ? (
                  <div className="min-h-[400px] lg:h-full">
                    <ViewerUnlockForm
                      onUnlock={viewer.unlock}
                      isLoading={viewer.isLoading}
                      error={viewer.error}
                      title="Join the Chat"
                      description="Enter your info to watch and chat"
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-[400px] lg:h-full">
                    <GameChatPanel 
                      chat={chat} 
                      className="h-full flex flex-col"
                      fontSize={fontSize}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="h-[300px] lg:h-full flex items-center justify-center bg-gray-900 rounded-lg text-gray-500 text-sm">
                Chat not available
              </div>
            )}
          </div>
        </div>

        {/* Fullscreen Chat Overlay - Only show when unlocked and in fullscreen */}
        {viewer.isUnlocked && bootstrap?.chatEnabled && bootstrap.gameId && isFullscreen && (
          <TchsFullscreenChatOverlay
            chat={chat}
            isVisible={isChatOverlayVisible}
            onToggle={() => setIsChatOverlayVisible(!isChatOverlayVisible)}
            position="right"
            fontSize={fontSize}
          />
        )}
      </div>
    </div>
  );
}
