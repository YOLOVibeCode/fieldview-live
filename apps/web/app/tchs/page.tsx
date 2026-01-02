'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
const SLUG = 'tchs';
const ADMIN_PASSWORD = 'tchs2026'; // Simple password protection

export default function TchsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [password, setPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'offline' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Load current stream URL from server
    fetch(`${API_URL}/api/tchs/${SLUG}`)
      .then((res) => {
        if (res.status === 404) {
          setStatus('offline');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.streamUrl) {
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
  }, []);

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

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setStatus('playing');
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setStatus('error');
      });
    }
  }

  async function toggleFullscreen(): Promise<void> {
    const container = playerContainerRef.current;
    if (!container) return;

    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    const el = container as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const video = videoRef.current as (HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      webkitDisplayingFullscreen?: boolean;
    }) | null;

    const activeFullscreenElement = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

    if (activeFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }
      if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
      return;
    }

    // iOS Safari: use native video fullscreen when available (more reliable than element fullscreen).
    if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }

    // Most browsers (including Android Chrome/Firefox): video element fullscreen is the most consistent UX.
    if (video?.requestFullscreen) {
      await video.requestFullscreen();
      return;
    }

    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const video = videoRef.current as (HTMLVideoElement & { webkitDisplayingFullscreen?: boolean }) | null;
      const active = Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement ?? video?.webkitDisplayingFullscreen);
      setIsFullscreen(active);
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    // Safari
    document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
    onFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
    };
  }, []);

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
      new URL(inputUrl);
    } catch {
      setMessage('Invalid URL format');
      return;
    }

    setMessage('Saving...');

    try {
      const res = await fetch(`${API_URL}/api/tchs/${SLUG}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamUrl: inputUrl.trim(), password }),
      });

      if (!res.ok) {
        const error = await res.json();
        setMessage(error.error || 'Failed to save stream URL');
        return;
      }

      setMessage('✓ Stream URL saved! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setMessage('Failed to save stream URL. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Admin Controls (collapsible) */}
      {isEditing && (
        <div className="bg-gray-900 border-b border-gray-700 p-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-medium">Update Stream URL</h2>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setMessage('');
                }}
                className="text-gray-400 hover:text-white text-sm"
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

      {/* Quick Edit Button (always visible) */}
      {!isEditing && (
        <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
          <button
            onClick={() => {
              void toggleFullscreen();
            }}
            className="px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-70 hover:opacity-100"
            data-testid="btn-fullscreen"
            aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          >
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-50 hover:opacity-100"
            data-testid="btn-open-edit"
          >
            Edit Stream URL
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="mb-4 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">TCHS Live</h1>
            <p className="text-gray-400 text-sm">Timber Creek High School</p>
          </div>

          {/* Video Player */}
          <div
            ref={playerContainerRef}
            className="relative w-full bg-gray-900 rounded-lg overflow-hidden"
            style={isFullscreen ? { height: '100vh' } : { paddingBottom: '56.25%' }}
            data-testid="container-player"
          >
            {status === 'offline' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <p className="text-xl mb-2">Stream Offline</p>
                  <p className="text-sm text-gray-400 mb-4">
                    The stream will start soon. Check back shortly.
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
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
          </div>

          {/* Footer */}
          <div className="mt-4 text-center text-gray-500 text-xs">
            <p>Powered by FieldView.Live • Share this link: <strong>fieldview.live/tchs/</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
