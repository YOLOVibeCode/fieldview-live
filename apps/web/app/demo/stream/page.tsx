'use client';

/**
 * Simple Stream Test Page
 *
 * Minimal HLS player for testing stream functionality.
 * No dependencies on complex templates - just video + HLS.js
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

// Default test stream (Mux public test)
const DEFAULT_STREAM = 'https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU.m3u8';

type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export default function StreamTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [streamUrl, setStreamUrl] = useState(DEFAULT_STREAM);
  const [inputUrl, setInputUrl] = useState(DEFAULT_STREAM);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [videoMounted, setVideoMounted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Add log entry
  const log = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev.slice(-50), `[${timestamp}] ${message}`]);
    console.log(`[StreamTest] ${message}`);
  }, []);

  // Callback ref to detect video mount
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      log('Video element mounted');
      setVideoMounted(true);
    } else {
      setVideoMounted(false);
    }
  }, [log]);

  // Initialize HLS player
  const initPlayer = useCallback((url: string) => {
    const video = videoRef.current;

    if (!video) {
      log('Video ref not available - cannot initialize');
      return;
    }

    // Destroy existing instance
    if (hlsRef.current) {
      log('Destroying existing HLS instance');
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setError(null);
    setStatus('loading');
    log(`Initializing HLS with URL: ${url.substring(0, 50)}...`);

    // Check HLS.js support
    if (Hls.isSupported()) {
      log('HLS.js is supported');

      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        log('HLS: Media attached');
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        log(`HLS: Manifest parsed, ${data.levels.length} quality levels`);
        video.play().then(() => {
          log('Video playback started');
          setStatus('playing');
        }).catch(err => {
          log(`Autoplay blocked: ${err.message}`);
          setStatus('paused');
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        log(`HLS Error: ${data.type} - ${data.details}`);
        if (data.fatal) {
          setError(`Fatal error: ${data.details}`);
          setStatus('error');
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              log('Network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              log('Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              log('Unrecoverable error');
              hls.destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        // Use functional update to avoid stale closure
        setStatus(prev => prev === 'loading' ? 'playing' : prev);
      });

      hls.attachMedia(video);
      hls.loadSource(url);
      hlsRef.current = hls;
      log('HLS instance created and source loading');

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      log('Using native HLS support');
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        log('Native: Metadata loaded');
        video.play().then(() => {
          setStatus('playing');
        }).catch(() => {
          setStatus('paused');
        });
      });
    } else {
      setError('HLS not supported in this browser');
      setStatus('error');
      log('HLS not supported');
    }
  }, [log]); // Removed 'status' dependency to prevent re-initialization loop

  // Load stream when URL changes
  useEffect(() => {
    if (streamUrl && videoMounted) {
      initPlayer(streamUrl);
    }
  }, [streamUrl, videoMounted, initPlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        log('Cleanup: Destroying HLS instance');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [log]);

  // Handle form submit
  const handleLoadStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      log(`Loading new stream: ${inputUrl}`);
      setStreamUrl(inputUrl.trim());
    }
  };

  // Handle video events
  const handlePlay = () => {
    log('Video: play event');
    setStatus('playing');
  };

  const handlePause = () => {
    log('Video: pause event');
    setStatus('paused');
  };

  const handleError = () => {
    log('Video: error event');
    setStatus('error');
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Stream Test</h1>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              status === 'playing' ? 'bg-green-500' :
              status === 'loading' ? 'bg-yellow-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`} />
            <span className="text-sm text-gray-400 uppercase">{status}</span>
          </div>
        </div>

        {/* Stream URL Input */}
        <form onSubmit={handleLoadStream} className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter HLS stream URL (.m3u8)"
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors"
          >
            Load
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
            {error}
          </div>
        )}

        {/* Video Player */}
        <div className="relative aspect-video bg-gray-900 rounded overflow-hidden">
          <video
            ref={setVideoRef}
            className="w-full h-full object-contain"
            controls
            playsInline
            muted
            onPlay={handlePlay}
            onPause={handlePause}
            onError={handleError}
          />

          {/* Loading Overlay */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-300">Loading stream...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => videoRef.current?.play()}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
          >
            Play
          </button>
          <button
            onClick={() => videoRef.current?.pause()}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-sm transition-colors"
          >
            Pause
          </button>
          <button
            onClick={() => {
              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }
              setStatus('idle');
              log('Stream stopped');
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
          >
            Stop
          </button>
          <button
            onClick={() => {
              // Force reload by clearing first, then setting
              setInputUrl(DEFAULT_STREAM);
              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }
              setStatus('idle');
              // Use setTimeout to ensure state is cleared before reloading
              setTimeout(() => {
                setStreamUrl(DEFAULT_STREAM);
                log('Reset to default test stream');
              }, 50);
            }}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
          >
            Reset to Test Stream
          </button>
        </div>

        {/* Debug Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-900 rounded">
            <h3 className="font-semibold text-gray-400 mb-2">Video State</h3>
            <div className="space-y-1 text-gray-300">
              <p>Mounted: <span className={videoMounted ? 'text-green-400' : 'text-red-400'}>{videoMounted ? 'Yes' : 'No'}</span></p>
              <p>HLS Instance: <span className={hlsRef.current ? 'text-green-400' : 'text-gray-500'}>{hlsRef.current ? 'Active' : 'None'}</span></p>
              <p>HLS Supported: <span className="text-green-400">{Hls.isSupported() ? 'Yes' : 'No'}</span></p>
            </div>
          </div>

          <div className="p-3 bg-gray-900 rounded">
            <h3 className="font-semibold text-gray-400 mb-2">Stream Info</h3>
            <div className="space-y-1 text-gray-300">
              <p className="truncate">URL: {streamUrl.substring(0, 40)}...</p>
              <p>Status: {status}</p>
            </div>
          </div>
        </div>

        {/* Log Output */}
        <div className="p-3 bg-gray-900 rounded">
          <h3 className="font-semibold text-gray-400 mb-2">Logs</h3>
          <div className="h-48 overflow-y-auto font-mono text-xs text-gray-400 space-y-1">
            {logs.map((entry, i) => (
              <p key={i}>{entry}</p>
            ))}
            {logs.length === 0 && <p className="text-gray-600">No logs yet...</p>}
          </div>
        </div>

        {/* Test Streams */}
        <div className="p-3 bg-gray-900 rounded">
          <h3 className="font-semibold text-gray-400 mb-2">Quick Test Streams</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const url = 'https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU.m3u8';
                setInputUrl(url);
                // Force reload even if same URL
                if (hlsRef.current) {
                  hlsRef.current.destroy();
                  hlsRef.current = null;
                }
                setStatus('idle');
                setTimeout(() => setStreamUrl(url), 50);
              }}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Mux Test (Big Buck Bunny)
            </button>
            <button
              onClick={() => {
                const url = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
                setInputUrl(url);
                if (hlsRef.current) {
                  hlsRef.current.destroy();
                  hlsRef.current = null;
                }
                setStatus('idle');
                setTimeout(() => setStreamUrl(url), 50);
              }}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Mux Dev Test
            </button>
            <button
              onClick={() => {
                const url = 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8';
                setInputUrl(url);
                if (hlsRef.current) {
                  hlsRef.current.destroy();
                  hlsRef.current = null;
                }
                setStatus('idle');
                setTimeout(() => setStreamUrl(url), 50);
              }}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Akamai Live Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
