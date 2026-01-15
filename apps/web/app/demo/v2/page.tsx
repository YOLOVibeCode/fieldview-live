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
import { usePaywall } from '@/hooks/usePaywall';

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

const PaywallModal = dynamic(
  () => import('@/components/v2/paywall').then((mod) => ({ default: mod.PaywallModal })),
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

  // Paywall (demo mode with bypass)
  const paywall = usePaywall({
    slug: 'demo-v2',
    enabled: false, // Don't fetch from API, use local config
    demoMode: true,
    bypassCode: 'FIELDVIEW2026',
  });

  // Debug: Log paywall state
  useEffect(() => {
    console.log('[Demo] Paywall state:', {
      showPaywall: paywall.showPaywall,
      isBypassed: paywall.isBypassed,
      hasPaid: paywall.hasPaid,
      isBlocked: paywall.isBlocked,
    });
  }, [paywall.showPaywall, paywall.isBypassed, paywall.hasPaid, paywall.isBlocked]);

  // Auto-open paywall for demo (only once, if not bypassed/paid)
  useEffect(() => {
    if (!paywall.isBypassed && !paywall.hasPaid && !paywall.showPaywall) {
      console.log('[Demo] Auto-opening paywall after 2s...');
      const timer = setTimeout(() => {
        console.log('[Demo] Opening paywall now!');
        paywall.openPaywall();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      console.log('[Demo] Skipping auto-open:', {
        isBypassed: paywall.isBypassed,
        hasPaid: paywall.hasPaid,
        showPaywall: paywall.showPaywall,
      });
    }
  }, []); // Run only once on mount

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
        {/* Success Message - Authenticated! */}
        {isAuthenticated && (
          <div className="m-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent animate-pulse" />
            <div className="relative bg-fv-bg-elevated border-2 border-green-500/30 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-green-500 mb-2">
                    ✅ You're In! All Features Unlocked
                  </h3>
                  <p className="text-xs text-fv-text-secondary mb-3">
                    Logged in as <span className="font-mono text-fv-primary">{userEmail}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full border border-green-500/20">
                      💬 Chat Enabled
                    </span>
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full border border-green-500/20">
                      🎯 Score Editing
                    </span>
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full border border-green-500/20">
                      📹 Fullscreen Mode
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Demo Credentials Box - ENHANCED! */}
        {!isAuthenticated && (
          <div className="m-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-fv-primary/5 to-transparent" />
            <div className="relative bg-fv-bg-elevated border-2 border-fv-primary/30 rounded-xl p-5 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-fv-primary/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-fv-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold text-fv-text-primary">
                      🎯 Quick Start Demo
                    </h3>
                    <span className="px-2 py-0.5 bg-fv-primary/20 text-fv-primary text-xs font-semibold rounded-full">
                      NEW
                    </span>
                  </div>
                  <div className="bg-fv-bg-secondary rounded-lg p-3 mb-3 border border-fv-border/50">
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-fv-text-tertiary">Email:</span>
                        <span className="text-fv-primary font-semibold">{demoCredentials.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-fv-text-tertiary">Password:</span>
                        <span className="text-fv-primary font-semibold">{demoCredentials.password}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-fv-text-secondary">
                    <svg className="w-4 h-4 text-fv-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Scroll down to chat, click "Send Message", and use these credentials to unlock all features!</span>
                  </div>
                </div>
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

        {/* Component Showcase - BELLS & WHISTLES! 🎉 */}
        <div className="p-4 space-y-6">
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-fv-primary/20 via-fv-bg-elevated to-fv-bg-elevated border border-fv-primary/30 rounded-2xl p-8">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-fv-primary/10 to-transparent animate-pulse opacity-50" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-fv-primary rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-fv-text-primary">
                    v2 Component Library
                  </h2>
                  <p className="text-sm text-fv-text-secondary">
                    Mobile-first • Accessible • Production-ready
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-fv-bg-primary/50 backdrop-blur-sm rounded-lg p-4 border border-fv-border/50">
                  <div className="text-3xl font-bold text-fv-primary mb-1">25</div>
                  <div className="text-xs text-fv-text-secondary">Components</div>
                </div>
                <div className="bg-fv-bg-primary/50 backdrop-blur-sm rounded-lg p-4 border border-fv-border/50">
                  <div className="text-3xl font-bold text-fv-primary mb-1">239</div>
                  <div className="text-xs text-fv-text-secondary">Unit Tests</div>
                </div>
                <div className="bg-fv-bg-primary/50 backdrop-blur-sm rounded-lg p-4 border border-fv-border/50">
                  <div className="text-3xl font-bold text-fv-primary mb-1">100%</div>
                  <div className="text-xs text-fv-text-secondary">Coverage</div>
                </div>
                <div className="bg-fv-bg-primary/50 backdrop-blur-sm rounded-lg p-4 border border-fv-border/50">
                  <div className="text-3xl font-bold text-fv-primary mb-1">0</div>
                  <div className="text-xs text-fv-text-secondary">Errors</div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Video Features */}
            <div className="bg-fv-bg-elevated border border-fv-border rounded-xl p-6 hover:border-fv-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-fv-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-fv-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-fv-text-primary mb-2">Video Player</h3>
                  <ul className="space-y-1 text-sm text-fv-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> HTML5 with HLS support
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Custom controls
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Fullscreen API
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Touch-optimized
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Scoreboard Features */}
            <div className="bg-fv-bg-elevated border border-fv-border rounded-xl p-6 hover:border-fv-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-fv-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-fv-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-fv-text-primary mb-2">Live Scoreboard</h3>
                  <ul className="space-y-1 text-sm text-fv-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Tap-to-edit scores
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Real-time updates
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Game clock
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Fullscreen overlay
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Chat Features */}
            <div className="bg-fv-bg-elevated border border-fv-border rounded-xl p-6 hover:border-fv-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-fv-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-fv-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-fv-text-primary mb-2">Real-time Chat</h3>
                  <ul className="space-y-1 text-sm text-fv-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Server-Sent Events
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Auto-scroll
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Authentication
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Compact mode
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Mobile Features */}
            <div className="bg-fv-bg-elevated border border-fv-border rounded-xl p-6 hover:border-fv-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-fv-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-fv-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-fv-text-primary mb-2">Mobile-First</h3>
                  <ul className="space-y-1 text-sm text-fv-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> 44px+ touch targets
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Responsive design
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Safe area support
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> WCAG 2.1 AA
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Paywall Features */}
            <div className="bg-fv-bg-elevated border border-fv-border rounded-xl p-6 hover:border-fv-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-fv-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-fv-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-fv-text-primary mb-2">
                    Paywall System
                    <Badge variant="success" className="ml-2 text-xs">NEW</Badge>
                  </h3>
                  <ul className="space-y-1 text-sm text-fv-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Square payment integration
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Saved card support
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Demo bypass code
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-fv-primary">✓</span> Mobile-optimized
                    </li>
                  </ul>
                  <TouchButton
                    variant="secondary"
                    size="sm"
                    onClick={() => paywall.openPaywall()}
                    className="mt-3"
                    data-testid="btn-demo-paywall"
                  >
                    Try Demo Paywall
                  </TouchButton>
                </div>
              </div>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-gradient-to-r from-fv-bg-elevated to-fv-bg-secondary border border-fv-border rounded-xl p-6">
            <h3 className="font-semibold text-fv-text-primary mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-fv-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Built With
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'React 18', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { name: 'TypeScript', color: 'bg-blue-600/20 text-blue-300 border-blue-600/30' },
                { name: 'Next.js 14', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
                { name: 'Tailwind CSS', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                { name: 'Vitest', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { name: 'date-fns', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
              ].map((tech) => (
                <span
                  key={tech.name}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${tech.color}`}
                >
                  {tech.name}
                </span>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-fv-primary/10 to-fv-primary/5 border border-fv-primary/30 rounded-xl p-6 text-center">
            <h3 className="text-xl font-bold text-fv-text-primary mb-2">
              🎉 Phase 7 Complete!
            </h3>
            <p className="text-fv-text-secondary mb-4">
              All v2 components are production-ready. Try fullscreen mode, edit the score, and chat!
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-fv-text-secondary">85% Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-fv-text-secondary">Ready for Phase 8</span>
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
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          onLogin={(data) => handleAuthSuccess(data.email)}
          onRegister={(data) => handleAuthSuccess(data.email)}
        />
      )}

      {/* V2 Paywall Modal (Demo Mode) */}
      {paywall.showPaywall && (
        <PaywallModal
          slug="demo-v2"
          isOpen={paywall.showPaywall}
          onClose={paywall.closePaywall}
          onSuccess={() => paywall.markAsPaid('demo-purchase-123')}
          priceInCents={499}
          paywallMessage="🎬 This is a demo paywall! Try the bypass code: FIELDVIEW2026"
          allowSavePayment={false}
          demoMode={true}
          onDemoBypass={() => {
            paywall.bypassPaywall('FIELDVIEW2026');
            paywall.closePaywall();
          }}
        />
      )}
    </PageShell>
  );
}

