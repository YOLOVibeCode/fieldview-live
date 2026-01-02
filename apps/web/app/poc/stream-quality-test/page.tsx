'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * POC: Stream Quality Comparison Test
 * 
 * Creates side-by-side Mux streams with different encoding profiles
 * to compare quality settings (Option A vs Option B vs Default).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

type EncodingProfile = 'default' | 'smart' | 'smart_4k';

interface StreamConfig {
  rtmpPublishUrl: string;
  streamKey: string;
  playbackId: string;
  muxStreamId: string;
  encodingProfile: EncodingProfile;
  profileDetails: {
    encodingTier: string;
    latencyMode: string;
    maxResolution: string;
    estimatedBitrate: string;
  };
}

interface StreamState {
  config: StreamConfig | null;
  status: 'idle' | 'creating' | 'ready' | 'live' | 'error';
  error: string | null;
  manifestAnalysis: ManifestAnalysis | null;
}

interface ManifestAnalysis {
  status: string;
  playbackId: string;
  manifestUrl: string;
  renditions: Array<{
    resolution: string;
    bandwidth: string;
    codec: string;
  }>;
}

const PROFILE_INFO: Record<EncodingProfile, { name: string; description: string; color: string }> = {
  default: {
    name: 'Default (Current)',
    description: 'Mux baseline - 1080p max @ ~4.7 Mbps',
    color: 'bg-gray-500',
  },
  smart: {
    name: 'Option A: Smart Encoding',
    description: 'ML-optimized encoding - 1080p @ 6-8 Mbps',
    color: 'bg-blue-500',
  },
  smart_4k: {
    name: 'Option B: Smart + 4K',
    description: '4K passthrough (if plan supports) @ 15-20 Mbps',
    color: 'bg-purple-500',
  },
};

function StreamPanel({ 
  profile, 
  state, 
  onCreate, 
  onDelete,
  onAnalyze,
}: { 
  profile: EncodingProfile;
  state: StreamState;
  onCreate: () => void;
  onDelete: () => void;
  onAnalyze: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const info = PROFILE_INFO[profile];

  // Setup HLS playback when stream is ready
  useEffect(() => {
    if (!state.config?.playbackId || !videoRef.current) return;

    const video = videoRef.current;
    const streamUrl = `https://stream.mux.com/${state.config.playbackId}.m3u8`;

    // For Safari (native HLS support)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      return;
    }

    // For other browsers (use hls.js)
    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: false, // We want quality, not low latency
        backBufferLength: 90,
      });
      
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }
  }, [state.config?.playbackId]);

  return (
    <Card className="flex flex-col h-full" data-testid={`card-stream-${profile}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${info.color}`} />
          <CardTitle className="text-lg">{info.name}</CardTitle>
        </div>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Video Player */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {state.config ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                controls
                playsInline
                muted
                data-testid={`video-${profile}`}
              />
              {state.status === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-center p-4">
                  <div>
                    <p className="font-semibold mb-2">Waiting for stream...</p>
                    <p className="text-sm text-gray-300">Point your Veo at the RTMP URL below</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <p>No stream created</p>
            </div>
          )}
        </div>

        {/* RTMP Credentials */}
        {state.config && (
          <div className="space-y-2 text-xs">
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div>
                <label className="font-semibold text-muted-foreground">RTMP URL:</label>
                <code className="block mt-1 break-all select-all" data-testid={`rtmp-url-${profile}`}>
                  {state.config.rtmpPublishUrl}
                </code>
              </div>
              <div>
                <label className="font-semibold text-muted-foreground">Stream Key:</label>
                <code className="block mt-1 break-all select-all font-mono" data-testid={`stream-key-${profile}`}>
                  {state.config.streamKey}
                </code>
              </div>
              <div>
                <label className="font-semibold text-muted-foreground">Playback ID:</label>
                <code className="block mt-1 break-all" data-testid={`playback-id-${profile}`}>
                  {state.config.playbackId}
                </code>
              </div>
            </div>
            
            {/* Profile Details */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="font-semibold text-muted-foreground mb-1">Encoding Settings:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Tier: {state.config.profileDetails.encodingTier}</li>
                <li>• Latency: {state.config.profileDetails.latencyMode}</li>
                <li>• Max Res: {state.config.profileDetails.maxResolution}</li>
                <li>• Est. Bitrate: {state.config.profileDetails.estimatedBitrate}</li>
              </ul>
            </div>

            {/* Manifest Analysis */}
            {state.manifestAnalysis && state.manifestAnalysis.renditions.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                  Actual Renditions (Live):
                </p>
                <ul className="space-y-1 text-green-700 dark:text-green-300">
                  {state.manifestAnalysis.renditions.map((r, i) => (
                    <li key={i}>• {r.resolution} @ {r.bandwidth}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm" role="alert" data-testid={`error-${profile}`}>
            {state.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {!state.config ? (
            <Button 
              onClick={onCreate} 
              disabled={state.status === 'creating'}
              className="flex-1"
              data-testid={`btn-create-${profile}`}
            >
              {state.status === 'creating' ? 'Creating...' : 'Create Stream'}
            </Button>
          ) : (
            <>
              <Button 
                onClick={onAnalyze}
                variant="outline"
                className="flex-1"
                data-testid={`btn-analyze-${profile}`}
              >
                Analyze
              </Button>
              <Button 
                onClick={onDelete}
                variant="destructive"
                data-testid={`btn-delete-${profile}`}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StreamQualityTestPage() {
  const [streams, setStreams] = useState<Record<EncodingProfile, StreamState>>({
    default: { config: null, status: 'idle', error: null, manifestAnalysis: null },
    smart: { config: null, status: 'idle', error: null, manifestAnalysis: null },
    smart_4k: { config: null, status: 'idle', error: null, manifestAnalysis: null },
  });

  const createStream = useCallback(async (profile: EncodingProfile) => {
    setStreams(prev => ({
      ...prev,
      [profile]: { ...prev[profile], status: 'creating', error: null },
    }));

    try {
      const response = await fetch(`${API_URL}/api/test/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create stream');
      }

      const config: StreamConfig = await response.json();
      
      setStreams(prev => ({
        ...prev,
        [profile]: { config, status: 'ready', error: null, manifestAnalysis: null },
      }));
    } catch (err) {
      setStreams(prev => ({
        ...prev,
        [profile]: { 
          ...prev[profile], 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      }));
    }
  }, []);

  const deleteStream = useCallback(async (profile: EncodingProfile) => {
    const config = streams[profile].config;
    if (!config) return;

    try {
      await fetch(`${API_URL}/api/test/streams/${config.muxStreamId}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore delete errors
    }

    setStreams(prev => ({
      ...prev,
      [profile]: { config: null, status: 'idle', error: null, manifestAnalysis: null },
    }));
  }, [streams]);

  const analyzeStream = useCallback(async (profile: EncodingProfile) => {
    const config = streams[profile].config;
    if (!config) return;

    try {
      const response = await fetch(`${API_URL}/api/test/streams/${config.muxStreamId}/manifest`);
      if (response.ok) {
        const analysis: ManifestAnalysis = await response.json();
        setStreams(prev => ({
          ...prev,
          [profile]: { ...prev[profile], manifestAnalysis: analysis },
        }));
      }
    } catch {
      // Ignore analyze errors
    }
  }, [streams]);

  // Auto-analyze streams periodically
  useEffect(() => {
    const interval = setInterval(() => {
      Object.entries(streams).forEach(([profile, state]) => {
        if (state.config && state.status !== 'creating') {
          analyzeStream(profile as EncodingProfile);
        }
      });
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [streams, analyzeStream]);

  const createAllStreams = () => {
    createStream('default');
    createStream('smart');
    createStream('smart_4k');
  };

  const deleteAllStreams = () => {
    deleteStream('default');
    deleteStream('smart');
    deleteStream('smart_4k');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Stream Quality Comparison Test</h1>
          <p className="text-slate-400 mt-1">
            Compare Mux encoding profiles side-by-side with your Veo camera
          </p>
        </div>
      </header>

      {/* Instructions */}
      <div className="container mx-auto px-4 py-6">
        <Card className="bg-amber-950/30 border-amber-700/50 mb-6">
          <CardContent className="pt-4">
            <h3 className="font-semibold text-amber-200 mb-2">📋 How to Test:</h3>
            <ol className="list-decimal list-inside space-y-1 text-amber-100/80 text-sm">
              <li>Click &quot;Create All Streams&quot; to generate 3 streams with different profiles</li>
              <li>Copy the RTMP URL and Stream Key for each profile</li>
              <li>Configure your Veo camera to stream to one at a time (or use 3 sources)</li>
              <li>Click &quot;Analyze&quot; while live to see actual encoding quality</li>
              <li>Compare the renditions: higher bitrate = better quality</li>
            </ol>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={createAllStreams}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="btn-create-all"
          >
            Create All Streams
          </Button>
          <Button 
            onClick={deleteAllStreams}
            variant="outline"
            size="lg"
            className="border-red-600 text-red-400 hover:bg-red-950"
            data-testid="btn-delete-all"
          >
            Delete All
          </Button>
        </div>

        {/* Stream Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['default', 'smart', 'smart_4k'] as const).map((profile) => (
            <StreamPanel
              key={profile}
              profile={profile}
              state={streams[profile]}
              onCreate={() => createStream(profile)}
              onDelete={() => deleteStream(profile)}
              onAnalyze={() => analyzeStream(profile)}
            />
          ))}
        </div>

        {/* Comparison Guide */}
        <Card className="mt-8 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle>🎯 What to Look For</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <div>
              <h4 className="font-semibold text-white">Bitrate Comparison</h4>
              <p className="text-sm">
                Higher bitrates mean more data per second = better quality. Veo outputs 12-20 Mbps at 4K. 
                If Mux shows 4.7 Mbps, you&apos;re losing 65-75% of your source quality.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white">Resolution</h4>
              <p className="text-sm">
                Veo records at 4K (3840×2160). If your top rendition is 1920×1080, you&apos;ve lost 75% of pixels.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white">Motion Artifacts</h4>
              <p className="text-sm">
                Watch for blocking/pixelation during fast player movement. Higher bitrates reduce this significantly.
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <h4 className="font-semibold text-white mb-2">Expected Results</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-2">Profile</th>
                    <th className="pb-2">Top Resolution</th>
                    <th className="pb-2">Top Bitrate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1">Default</td>
                    <td>1920×1080</td>
                    <td>~4.7 Mbps</td>
                  </tr>
                  <tr>
                    <td className="py-1">Smart</td>
                    <td>1920×1080</td>
                    <td>~6-8 Mbps</td>
                  </tr>
                  <tr>
                    <td className="py-1">Smart + 4K</td>
                    <td>3840×2160*</td>
                    <td>~15-20 Mbps*</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">* 4K requires Mux plan support</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

