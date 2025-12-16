'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Hls from 'hls.js';

/**
 * Direct Playback Page
 * 
 * Auto-plays a Mux stream by playback ID
 * URL: /play/{playbackId}
 * 
 * Example: /play/d01HSJnFuUTgCwHZNz54ZUSBUeTB28N2Uth2DqwI802pY
 */

export default function PlayPage() {
  const params = useParams();
  const playbackId = params.playbackId as string;
  
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!playbackId || !videoRef.current) return;

    const video = videoRef.current;
    const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    
    setError(null);

    // For Safari (native HLS support)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.play().catch((err) => {
        setError(`Auto-play blocked: ${err.message}`);
      });
      return;
    }

    // For other browsers (use hls.js)
    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsPlaying(true);
        // Auto-play
        video.play().catch((err) => {
          setError(`Auto-play blocked: ${err.message}. Click play to start.`);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          setError(`Playback error: ${data.type}`);
        }
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else {
      setError('HLS is not supported in this browser');
    }
  }, [playbackId]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Video Player - Full viewport */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          playsInline
          preload="auto"
          autoPlay
          muted={false}
        />
        
        {/* Live indicator overlay */}
        {isPlaying && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-md text-sm max-w-md text-center">
            {error}
          </div>
        )}
      </div>

      {/* Info bar (minimal) */}
      <div className="bg-gray-900 text-white px-4 py-2 text-xs text-center">
        <span className="text-gray-400">Playback ID:</span>{' '}
        <span className="font-mono">{playbackId}</span>
      </div>
    </div>
  );
}
