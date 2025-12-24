'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * POC: Mobile-optimized RTMP stream viewer
 * 
 * Features:
 * - Full resolution video playback
 * - Mobile-responsive (uses full available space on phones)
 * - Native fullscreen support
 * - HLS playback via Mux relay
 */

export default function StreamViewerPOC() {
  const [streamUrl, setStreamUrl] = useState('');
  const [streamUrlInput, setStreamUrlInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize HLS player when stream URL is provided
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    setError(null);

    // For Safari (native HLS support)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      setIsConnected(true);
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
        setIsConnected(true);
        // Auto-play on mobile when possible
        video.play().catch(() => {
          // Auto-play might be blocked; user will need to tap play
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          setError(`Playback error: ${data.type}`);
          setIsConnected(false);
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
  }, [streamUrl]);

  const handleConnect = () => {
    if (streamUrlInput.trim()) {
      setStreamUrl(streamUrlInput.trim());
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleDisconnect = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.src = '';
    }
    setStreamUrl('');
    setIsConnected(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Hidden on mobile when connected */}
      <div className={`container mx-auto p-4 ${isConnected ? 'hidden md:block' : ''}`}>
        <Card>
          <CardHeader>
            <CardTitle>RTMP Stream Viewer POC</CardTitle>
            <CardDescription>
              Mobile-optimized viewer for RTMP streams relayed via Mux
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This POC allows you to view an RTMP stream that&apos;s being relayed through Mux.
                  The video player is optimized for mobile devices and will use the full available resolution.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="stream-url-input">HLS Stream URL</Label>
                  <Input
                    id="stream-url-input"
                    type="url"
                    placeholder="https://stream.mux.com/[PLAYBACK_ID].m3u8?token=[JWT]"
                    value={streamUrlInput}
                    onChange={(e) => setStreamUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleConnect();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleConnect} size="lg" className="w-full md:w-auto" disabled={!streamUrlInput.trim()}>
                  Connect to Stream
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <Button onClick={handleDisconnect} variant="outline" size="sm">
                  Disconnect
                </Button>
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Video Player - Full viewport on mobile when connected */}
      {isConnected && (
        <div
          ref={containerRef}
          className={`
            ${isFullscreen ? 'fixed inset-0 z-50' : 'md:container md:mx-auto md:px-4'}
            ${!isFullscreen && 'h-screen md:h-auto'}
          `}
        >
          <div className="relative w-full h-full md:aspect-video bg-black">
            {/* Video Element - Uses full resolution */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              playsInline
              preload="auto"
              autoPlay
              muted={false}
              aria-label="Stream video player"
            />
            
            {/* Fullscreen Toggle - Desktop only (mobile has native controls) */}
            <div className="hidden md:block absolute bottom-4 right-4">
              <Button
                onClick={toggleFullscreen}
                variant="secondary"
                size="sm"
                className="opacity-80 hover:opacity-100"
              >
                {isFullscreen ? '🗗 Exit Fullscreen' : '🗖 Fullscreen'}
              </Button>
            </div>
          </div>

          {/* Stream Info Overlay - Shows briefly, can be dismissed */}
          {!isFullscreen && (
            <div className="md:mt-4 p-4 bg-card md:rounded-lg md:border">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium">LIVE</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Streaming in highest available quality
                  </p>
                </div>
                <Button onClick={handleDisconnect} variant="ghost" size="sm">
                  End
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions - Only shown when not connected */}
      {!isConnected && (
        <div className="container mx-auto p-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-1">1. Set up RTMP stream</h4>
                <p className="text-muted-foreground">
                  Configure your RTMP source to stream to Mux. You can get the RTMP URL and stream key
                  from the admin panel or API.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">2. Get the HLS playback URL</h4>
                <p className="text-muted-foreground">
                  Use the Mux playback ID to generate an HLS URL. For signed playback, include the JWT token.
                </p>
                <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
                  https://stream.mux.com/[PLAYBACK_ID].m3u8?token=[JWT]
                </code>
              </div>
              <div>
                <h4 className="font-medium mb-1">3. Connect and view</h4>
                <p className="text-muted-foreground">
                  Click &quot;Connect to Stream&quot; and paste the HLS URL. On mobile, the video will use
                  the full screen space for the best viewing experience.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

