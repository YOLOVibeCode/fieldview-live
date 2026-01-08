'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { FullscreenChatOverlay } from '@/components/FullscreenChatOverlay';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';
import { GameChatPanel } from '@/components/GameChatPanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
const ADMIN_PASSWORD = 'admin2026'; // Password protection

interface Bootstrap {
  slug: string;
  gameId: string | null;
  streamUrl: string | null;
  chatEnabled: boolean;
  title: string;
}

interface DirectStreamPageProps {
  params: {
    slug: string;
  };
}

export default function DirectStreamPage({ params }: DirectStreamPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'offline' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOverlayVisible, setIsChatOverlayVisible] = useState(false);
  const slug = params.slug || '';

  // Chat integration
  const viewer = useViewerIdentity({ gameId: bootstrap?.gameId || null });
  const chat = useGameChat({
    gameId: bootstrap?.gameId || null,
    viewerToken: viewer.token,
    enabled: viewer.isUnlocked && bootstrap?.chatEnabled === true,
  });

  // Load bootstrap data
  useEffect(() => {
    fetch(`${API_URL}/api/direct/${slug}/bootstrap`)
      .then((res) => {
        if (res.status === 404) {
          setStatus('offline');
          return null;
        }
        return res.json();
      })
      .then((data: Bootstrap | null) => {
        if (!data) return;
        
        setBootstrap(data);
        if (data.streamUrl) {
          setStreamUrl(data.streamUrl);
          setInputUrl(data.streamUrl);
          initPlayer(data.streamUrl);
        } else {
          setStatus('offline');
        }
      })
      .catch(() => {
        setStatus('offline');
      });
  }, [slug]);

  function initPlayer(url: string) {
    const video = videoRef.current;
    if (!video) return;

    setStatus('loading');

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          console.error('Play failed:', err);
          setStatus('error');
        });
        setStatus('playing');
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              hls.destroy();
              setStatus('error');
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((err) => {
          console.error('Play failed:', err);
          setStatus('error');
        });
        setStatus('playing');
      });
      video.addEventListener('error', () => {
        setStatus('error');
      });
    } else {
      setStatus('error');
    }
  }

  async function handleSaveUrl() {
    if (!inputUrl.trim()) {
      setMessage('Please enter a stream URL');
      return;
    }

    if (!password) {
      setMessage('Please enter the admin password');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/direct/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamUrl: inputUrl.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const error = data.error || 'Failed to save stream URL';
        setMessage(error);
        return;
      }

      setMessage('✓ Stream URL saved! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to save stream URL:', error);
      setMessage('Failed to save stream URL. Please try again.');
    }
  }

  function toggleFullscreen() {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts: F for fullscreen, C for chat overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }

      if ((e.key === 'c' || e.key === 'C') && isFullscreen && viewer.isUnlocked) {
        e.preventDefault();
        setIsChatOverlayVisible(!isChatOverlayVisible);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isChatOverlayVisible, viewer.isUnlocked]);

  // Format slug for display (e.g., "StormFC" -> "Storm FC")
  const displayName = slug
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/^\w/, (c) => c.toUpperCase());

  // Use original slug for main title to preserve "StormFC" format
  const mainTitle = slug.replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full gap-4 p-4">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 border-b border-gray-700 p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{mainTitle} Live Stream</h1>
                <p className="text-gray-400 text-sm">{displayName}</p>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  data-testid="btn-edit-stream"
                >
                  Edit Stream URL
                </button>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="bg-gray-900 border-b border-gray-700 p-4">
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-medium">
                    Update Stream URL: {displayName}
                  </h2>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setMessage('');
                    }}
                    className="text-gray-400 hover:text-white text-sm"
                    data-testid="btn-close-edit"
                  >
                    Close ✕
                  </button>
                </div>

                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://stream.mux.com/PLAYBACK_ID.m3u8"
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                  data-testid="input-stream-url"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin password"
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                  data-testid="input-admin-password"
                />

                {message && (
                  <p
                    className={`text-sm ${message.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}
                    data-testid="message-update"
                  >
                    {message}
                  </p>
                )}

                <button
                  onClick={handleSaveUrl}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  data-testid="btn-save-stream"
                >
                  Save Stream URL
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Video Player Container */}
            <div
              ref={playerContainerRef}
              className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
              style={{ minHeight: '400px' }}
            >
              {status === 'offline' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-xl mb-2">Stream Offline</p>
                    <p className="text-sm text-gray-400 mb-4">No stream URL configured</p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      data-testid="btn-set-stream"
                    >
                      Set Stream URL
                    </button>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-xl mb-2">Unable to Load Stream</p>
                    <p className="text-sm text-gray-400 mb-4">Please check the stream URL and try again.</p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      data-testid="btn-update-stream"
                    >
                      Update Stream URL
                    </button>
                  </div>
                </div>
              )}

              {status === 'loading' && streamUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-xl mb-2">Loading stream...</p>
                  </div>
                </div>
              )}

              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full bg-black object-contain"
                controls
                playsInline
                data-testid="video-player"
              />

              {/* Fullscreen Chat Overlay - Only show when unlocked and in fullscreen */}
              {viewer.isUnlocked && bootstrap?.chatEnabled && bootstrap.gameId && isFullscreen && (
                <FullscreenChatOverlay
                  chat={chat}
                  isVisible={isChatOverlayVisible}
                  onToggle={() => setIsChatOverlayVisible(!isChatOverlayVisible)}
                  position="right"
                />
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-gray-500 text-xs">
              <p>
                Powered by FieldView.Live • Share this link:{' '}
                <strong>fieldview.live/direct/{slug}/</strong>
              </p>
              {!isFullscreen && (
                <p className="mt-2">
                  💡 Press <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">F</kbd> for fullscreen
                  {viewer.isUnlocked && bootstrap?.chatEnabled && (
                    <>, <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">C</kbd> to toggle chat</>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Chat (Desktop) */}
        {!isFullscreen && bootstrap?.chatEnabled && bootstrap.gameId && (
          <div className="w-full lg:w-96 flex flex-col">
            <div className="bg-gray-900 rounded-lg p-4 h-[600px] flex flex-col">
              <h2 className="text-white font-bold text-lg mb-4">Live Chat</h2>
              
              {!viewer.isUnlocked ? (
                <ViewerUnlockForm
                  onUnlock={viewer.unlock}
                  isLoading={viewer.isLoading}
                  error={viewer.error}
                  title="Join the conversation"
                  description="Enter your info to chat with other viewers"
                />
              ) : (
                <div className="flex-1 min-h-0">
                  <GameChatPanel chat={chat} className="h-full" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

