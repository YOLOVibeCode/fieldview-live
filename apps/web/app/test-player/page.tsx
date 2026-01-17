'use client';

/**
 * Test Player Page - Compare HLS.js vs Video.js vs Native
 * 
 * Quick test page to verify stream playback with multiple players
 */

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const STREAM_URL = 'https://stream.mux.com/Be02yA6vRJb8fQ01U4yuj01C9KKPC02gHCdBX71J02McpZb4.m3u8';

export default function TestPlayerPage() {
  const hlsVideoRef = useRef<HTMLVideoElement>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const [hlsStatus, setHlsStatus] = useState('initializing...');
  const [nativeStatus, setNativeStatus] = useState('initializing...');

  // HLS.js Player
  useEffect(() => {
    const video = hlsVideoRef.current;
    if (!video) return;

    setHlsStatus('loading...');

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: true,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(STREAM_URL);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHlsStatus('✅ Manifest parsed, ready to play');
        video.play().catch((err) => {
          setHlsStatus(`⚠️ Autoplay blocked: ${err.message}`);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setHlsStatus(`❌ Fatal error: ${data.type} - ${data.details}`);
        } else {
          setHlsStatus(`⚠️ Error: ${data.type} - ${data.details}`);
        }
      });

      return () => hls.destroy();
    } else {
      setHlsStatus('❌ HLS.js not supported');
    }
  }, []);

  // Native HLS Player (Safari)
  useEffect(() => {
    const video = nativeVideoRef.current;
    if (!video) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setNativeStatus('loading...');
      video.src = STREAM_URL;

      video.addEventListener('loadedmetadata', () => {
        setNativeStatus('✅ Metadata loaded, ready to play');
        video.play().catch((err) => {
          setNativeStatus(`⚠️ Autoplay blocked: ${err.message}`);
        });
      });

      video.addEventListener('error', (e) => {
        const error = (e.target as HTMLVideoElement)?.error;
        setNativeStatus(`❌ Error code: ${error?.code} - ${error?.message}`);
      });
    } else {
      setNativeStatus('❌ Native HLS not supported');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Stream Player Test</h1>
          <p className="text-gray-400">Testing Mux HLS stream with different players</p>
          <div className="mt-4 p-4 bg-gray-800 rounded">
            <p className="font-mono text-sm break-all">{STREAM_URL}</p>
          </div>
        </div>

        {/* HLS.js Player */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">HLS.js Player (v1.5.12)</h2>
            <p className="text-sm text-gray-400">Status: {hlsStatus}</p>
          </div>
          <video
            ref={hlsVideoRef}
            controls
            muted
            playsInline
            className="w-full aspect-video bg-black rounded"
            data-testid="video-hlsjs"
          />
        </div>

        {/* Native HLS Player */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Native HTML5 Player (Safari)</h2>
            <p className="text-sm text-gray-400">Status: {nativeStatus}</p>
          </div>
          <video
            ref={nativeVideoRef}
            controls
            muted
            playsInline
            className="w-full aspect-video bg-black rounded"
            data-testid="video-native"
          />
        </div>

        {/* Direct Link Test */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Simple HTML5 Video Tag</h2>
            <p className="text-sm text-gray-400">Directly load HLS in src attribute</p>
          </div>
          <video
            src={STREAM_URL}
            controls
            muted
            playsInline
            className="w-full aspect-video bg-black rounded"
            data-testid="video-simple"
          />
        </div>

        <div className="p-4 bg-blue-900/50 border border-blue-500 rounded">
          <h3 className="font-bold mb-2">Instructions:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>All players are muted for autoplay compatibility</li>
            <li>Click play if autoplay is blocked</li>
            <li>Check browser console for detailed HLS.js logs</li>
            <li>Compare quality and buffering between players</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
