/**
 * Demo Page v2
 * 
 * Showcase of all v2 components in a functional direct stream viewer
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { VideoContainer, VideoPlayer, VideoControls } from '@/components/v2/video';
import { PageShell, Header } from '@/components/v2/layout';
import { TouchButton, Badge } from '@/components/v2/primitives';
import { useFullscreen } from '@/hooks/v2/useFullscreen';
import { useResponsive } from '@/hooks/v2/useResponsive';

// Dynamically import components that have issues with SSR
const Scoreboard = dynamic(
  () => import('@/components/v2/scoreboard').then((mod) => ({ default: mod.Scoreboard })),
  { ssr: false }
);

const Chat = dynamic(
  () => import('@/components/v2/chat').then((mod) => ({ default: mod.Chat })),
  { ssr: false }
);

const AuthModal = dynamic(
  () => import('@/components/v2/auth').then((mod) => ({ default: mod.AuthModal })),
  { ssr: false }
);

export default function DemoV2Page() {
  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Fullscreen
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(containerRef.current);

  // Responsive
  const { isMobile } = useResponsive();

  // Auth
  const [showAuth, setShowAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Scoreboard state
  const [scoreboardData, setScoreboardData] = useState({
    homeTeam: { name: 'Tigers', score: 2 },
    awayTeam: { name: 'Lions', score: 1 },
    period: 'Q2',
    timeRemaining: '8:34',
  });

  // Demo credentials display
  const demoCredentials = {
    email: 'demo@fieldview.live',
    password: 'demo123',
  };

  // Video event handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Scoreboard handlers
  const handleScoreChange = (team: 'home' | 'away', newScore: number) => {
    setScoreboardData((prev) => ({
      ...prev,
      [team === 'home' ? 'homeTeam' : 'awayTeam']: {
        ...prev[team === 'home' ? 'homeTeam' : 'awayTeam'],
        score: newScore,
      },
    }));
  };

  // Chat handlers
  const handleAuthRequired = () => {
    setShowAuth(true);
  };

  const handleAuthSuccess = (email: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setShowAuth(false);
  };

  // Auto-play on mount (muted for autoplay policy)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked, user interaction needed
      });
    }
  }, []);

  return (
    <PageShell>
      {/* Header */}
      <Header
        title="v2 Demo: Live Stream"
        left={
          <TouchButton
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </TouchButton>
        }
        right={
          <div className="flex items-center gap-2">
            <Badge variant="live" pulse>LIVE</Badge>
            {isAuthenticated && (
              <Badge variant="info">{userEmail}</Badge>
            )}
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Demo Credentials Box */}
        {!isAuthenticated && (
          <div className="p-4 bg-fv-bg-elevated border border-fv-border rounded-lg m-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-fv-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-fv-text-primary mb-2">
                  Demo Credentials
                </h3>
                <div className="space-y-1 text-xs text-fv-text-secondary font-mono">
                  <div>Email: {demoCredentials.email}</div>
                  <div>Password: {demoCredentials.password}</div>
                </div>
                <p className="mt-2 text-xs text-fv-text-tertiary">
                  Click "Send Message" in chat to authenticate
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Video Player */}
        <div ref={containerRef} className="relative bg-black">
          <VideoContainer fullWidth aspectRatio="16:9" rounded={false}>
            <VideoPlayer
              ref={videoRef}
              src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
              poster="https://image.mux.com/x36xhzz/thumbnail.jpg"
              autoPlay
              muted={isMuted}
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
          </VideoContainer>

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0">
            <VideoControls
              isPlaying={isPlaying}
              isMuted={isMuted}
              volume={volume}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={handlePlayPause}
              onMuteToggle={handleMuteToggle}
              onVolumeChange={handleVolumeChange}
              onSeek={handleSeek}
              onFullscreenToggle={toggleFullscreen}
            />
          </div>

          {/* Scoreboard Overlay (Fullscreen) */}
          {isFullscreen && (
            <div className="absolute top-4 left-4 z-10">
              <Scoreboard
                homeTeam={scoreboardData.homeTeam}
                awayTeam={scoreboardData.awayTeam}
                period={scoreboardData.period}
                timeRemaining={scoreboardData.timeRemaining}
                onScoreChange={handleScoreChange}
                compact
              />
            </div>
          )}

          {/* Chat Overlay (Fullscreen) */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 bottom-20 w-80 z-10">
              <Chat
                gameId="demo-game-v2"
                viewerIdentityId={userEmail || undefined}
                onAuthRequired={handleAuthRequired}
                compact
              />
            </div>
          )}
        </div>

        {/* Scoreboard (Non-Fullscreen) */}
        {!isFullscreen && (
          <div className="p-4">
            <Scoreboard
              homeTeam={scoreboardData.homeTeam}
              awayTeam={scoreboardData.awayTeam}
              period={scoreboardData.period}
              timeRemaining={scoreboardData.timeRemaining}
              onScoreChange={handleScoreChange}
            />
          </div>
        )}

        {/* Chat (Non-Fullscreen) */}
        {!isFullscreen && (
          <div className="p-4">
            <div className="h-[500px]">
              <Chat
                gameId="demo-game-v2"
                viewerIdentityId={userEmail || undefined}
                onAuthRequired={handleAuthRequired}
              />
            </div>
          </div>
        )}

        {/* Component Showcase */}
        <div className="p-4 space-y-4">
          <div className="bg-fv-bg-elevated border border-fv-border rounded-lg p-4">
            <h2 className="text-lg font-semibold text-fv-text-primary mb-2">
              v2 Components Showcase
            </h2>
            <p className="text-sm text-fv-text-secondary mb-4">
              This page demonstrates all v2 components in a real-world scenario
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="font-mono text-fv-primary mb-1">✓ VideoPlayer</div>
                <div className="text-fv-text-tertiary">HTML5 video</div>
              </div>
              <div>
                <div className="font-mono text-fv-primary mb-1">✓ VideoControls</div>
                <div className="text-fv-text-tertiary">Custom controls</div>
              </div>
              <div>
                <div className="font-mono text-fv-primary mb-1">✓ Scoreboard</div>
                <div className="text-fv-text-tertiary">Live scoring</div>
              </div>
              <div>
                <div className="font-mono text-fv-primary mb-1">✓ Chat</div>
                <div className="text-fv-text-tertiary">Real-time chat</div>
              </div>
              <div>
                <div className="font-mono text-fv-primary mb-1">✓ Auth</div>
                <div className="text-fv-text-tertiary">Registration</div>
              </div>
              <div>
                <div className="font-mono text-fv-primary mb-1">✓ Fullscreen</div>
                <div className="text-fv-text-tertiary">Native API</div>
              </div>
              <div>
                <div className="font-mono text-fv-primary mb-1">✓ Responsive</div>
                <div className="text-fv-text-tertiary">Mobile-first</div>
              </div>
              <div>
                <div className="font-mono text-fv-primary mb-1">✓ Accessible</div>
                <div className="text-fv-text-tertiary">WCAG 2.1 AA</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation (Mobile) - Commented out for SSR compatibility */}
      {/* TODO: Re-enable when BottomNav is updated to support custom icons */}

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          mode="register"
          onClose={() => setShowAuth(false)}
          onSuccess={(email) => handleAuthSuccess(email)}
          onSwitchMode={() => {
            // Toggle between login/register
          }}
        />
      )}
    </PageShell>
  );
}

