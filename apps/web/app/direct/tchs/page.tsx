'use client';

/**
 * TCHS Direct Stream Page with Chat
 * 
 * Responsive Layout:
 * - Mobile Portrait: Stacked (video top, chat bottom)
 * - Tablet: 70/30 split
 * - Desktop: 80/20 split
 * 
 * Mobile-first, touch-friendly, accessible!
 */

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { GameChatPanel } from '@/components/GameChatPanel';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';

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

const FONT_SIZE_STORAGE_KEY = 'tchs_chat_font_size';

export default function DirectTchsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'offline' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // Load font size preference
  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (saved === 'small' || saved === 'medium' || saved === 'large') {
      setFontSize(saved);
    }
  }, []);

  // Save font size preference
  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
  };

  // Load bootstrap data
  useEffect(() => {
    fetch(`${API_URL}/api/direct/tchs/bootstrap`)
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
  }, []);

  // Chat integration
  const viewer = useViewerIdentity({ gameId: bootstrap?.gameId || null });
  const chat = useGameChat({
    gameId: bootstrap?.gameId || null,
    viewerToken: viewer.token,
    enabled: viewer.isUnlocked && bootstrap?.chatEnabled === true,
  });

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
      const response = await fetch(`${API_URL}/api/tchs/tchs`, {
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
              fieldview.live/direct/tchs
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
              <button
                type="submit"
                className="px-6 py-3 min-h-[44px] bg-blue-600 text-white text-base font-medium rounded hover:bg-blue-700 transition active:scale-95"
              >
                Update Stream
              </button>
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
      <div className="max-w-screen-2xl mx-auto p-2 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 min-h-[calc(100vh-180px)] sm:min-h-[calc(100vh-200px)]">
          
          {/* Video Player - Mobile: Full width, Tablet: 70%, Desktop: 80% */}
          <div className="w-full lg:flex-[7] xl:flex-[4] flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden aspect-video lg:aspect-auto lg:min-h-[500px]">
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
      </div>
    </div>
  );
}
