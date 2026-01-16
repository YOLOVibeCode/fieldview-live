'use client';

/**
 * DirectStreamPageBase - Reusable Direct Stream Page Model
 * 
 * Base component that all direct stream pages inherit from.
 * Follows ISP (Interface Segregation Principle) and DRY.
 * 
 * Features:
 * - HLS video player with error recovery
 * - Admin stream URL management
 * - Real-time chat integration
 * - Fullscreen + keyboard shortcuts
 * - Responsive layout (desktop sidebar, mobile stack)
 * - Configurable theming and branding
 */

import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import Hls from 'hls.js';
import { MessageCircle, X } from 'lucide-react';
import { useGameChat } from '@/hooks/useGameChat';
import { useGameChatV2 } from '@/hooks/useGameChatV2';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { useGlobalViewerAuth } from '@/hooks/useGlobalViewerAuth';
import { GameChatPanel } from '@/components/GameChatPanel';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';
import { FullscreenChatOverlay } from '@/components/FullscreenChatOverlay';
import { FullscreenRegistrationOverlay } from '@/components/FullscreenRegistrationOverlay';
import { MobileControlBar } from '@/components/MobileControlBar';
import { AdminPanel } from '@/components/AdminPanel';
import { SocialProducerPanel } from '@/components/SocialProducerPanel';
import { ScoreboardOverlay } from '@/components/ScoreboardOverlay';
import { CollapsibleScoreboardOverlay } from '@/components/CollapsibleScoreboardOverlay';
import { ViewerAnalyticsPanel } from '@/components/ViewerAnalyticsPanel';
import { PaywallModal } from '@/components/PaywallModal';
import { Button } from '@/components/ui/button';
import { useCollapsiblePanel } from '@/hooks/useCollapsiblePanel';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { ChatMessage } from '@/hooks/useGameChat';
import { hashSlugSync } from '@/lib/hashSlug';
import { isTouchDevice, isMobileViewport } from '@/lib/utils/device-detection';
// v2 Components
import { VideoContainer, VideoPlayer, VideoControls } from '@/components/v2/video';
import { useFullscreen } from '@/hooks/v2/useFullscreen';
import { Chat } from '@/components/v2/chat';
import { Scoreboard } from '@/components/v2/scoreboard';
import { useScoreboardData } from '@/hooks/useScoreboardData';
import { ViewerAuthModal } from '@/components/v2/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

// Simple chat message form component
function ChatMessageForm({ chat }: { chat: { sendMessage: (text: string) => Promise<unknown>; isConnected: boolean } }) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const MAX_MESSAGE_LENGTH = 240;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await chat.sendMessage(trimmed);
      setMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const remainingChars = MAX_MESSAGE_LENGTH - messageText.length;
  const canSend = messageText.trim().length > 0 && !isSending;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={messageText}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= MAX_MESSAGE_LENGTH) {
              setMessageText(value);
            }
          }}
          placeholder="Type a message..."
          disabled={isSending || !chat.isConnected}
          maxLength={MAX_MESSAGE_LENGTH}
          data-testid="input-chat-message"
          className="min-h-[44px] text-base flex-1 bg-background/80 border-outline text-white placeholder:text-white/50"
          aria-label="Chat message input"
        />
        <Button
          type="submit"
          disabled={!canSend || !chat.isConnected}
          data-testid="btn-send-message"
          className="min-h-[44px] min-w-[80px] text-base font-medium"
          aria-label="Send message"
        >
          Send
        </Button>
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {remainingChars} character{remainingChars !== 1 ? 's' : ''} remaining
      </div>
    </form>
  );
}

export interface Bootstrap {
  slug: string;
  gameId: string | null;
  streamUrl: string | null;
  chatEnabled: boolean;
  title: string;
  paywallEnabled?: boolean;
  priceInCents?: number;
  paywallMessage?: string | null;
  allowSavePayment?: boolean;
  scoreboardEnabled?: boolean;
  scoreboardHomeTeam?: string | null;
  scoreboardAwayTeam?: string | null;
  scoreboardHomeColor?: string | null;
  scoreboardAwayColor?: string | null;
}

export type FontSize = 'small' | 'medium' | 'large';

export interface ChatOverlayProps {
  chat: ReturnType<typeof useGameChat>;
  isVisible: boolean;
  onToggle: () => void;
  position?: 'left' | 'right';
  fontSize?: FontSize;
}

export interface DirectStreamPageConfig {
  // Data fetching
  bootstrapUrl: string;
  updateStreamUrl: string;
  
  // Display
  title: string;
  subtitle?: string;
  sharePath: string;
  
  // Branding
  headerClassName?: string;
  containerClassName?: string;
  
  // Components
  ChatOverlayComponent?: React.ComponentType<ChatOverlayProps>;
  
  // Features
  enableFontSize?: boolean;
  fontSizeStorageKey?: string;
  
  // Callbacks
  onBootstrapLoaded?: (bootstrap: Bootstrap) => void;
  onStreamStatusChange?: (status: 'loading' | 'playing' | 'offline' | 'error') => void;
}

interface DirectStreamPageBaseProps {
  config: DirectStreamPageConfig;
  children?: ReactNode;
}

export function DirectStreamPageBase({ config, children }: DirectStreamPageBaseProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'offline' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [isChatOverlayVisible, setIsChatOverlayVisible] = useState(false);
  const [isScoreboardOverlayVisible, setIsScoreboardOverlayVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [adminJwt, setAdminJwt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showViewerAuthModal, setShowViewerAuthModal] = useState(false);
  const [showInlineRegistration, setShowInlineRegistration] = useState(false);

  // Video control state (v2)
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Fullscreen hook (v2)
  const { isFullscreen, toggleFullscreen: toggleFullscreenV2, isSupported: isFullscreenSupported } = useFullscreen(containerRef.current);

  // Mobile device detection
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Detect mobile on mount and window resize
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(isMobileViewport());
      setIsTouch(isTouchDevice());
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Collapsible panel state (non-fullscreen mode)
  // Use a stable key derived from bootstrapUrl (constant from first render)
  // This avoids the timing issue where bootstrap?.slug changes after load
  const stableKey = useMemo(() => {
    // Extract a stable identifier from the bootstrapUrl
    // e.g., /api/public/direct/tchs/events/soccer-20260109-varsity/bootstrap -> tchs-soccer-20260109-varsity
    // e.g., /api/direct/tchs/bootstrap -> tchs
    const parts = config.bootstrapUrl.split('/').filter(p => p && p !== 'api' && p !== 'public' && p !== 'direct' && p !== 'events' && p !== 'bootstrap');
    return parts.join('-') || 'default';
  }, [config.bootstrapUrl]);
  
  const scoreboardPanel = useCollapsiblePanel({
    edge: 'left',
    defaultCollapsed: true, // Collapsed by default
    storageKey: `scoreboard-collapsed-${stableKey}`,
  });

  const chatPanel = useCollapsiblePanel({
    edge: 'right',
    defaultCollapsed: true, // Collapsed by default
    storageKey: `chat-collapsed-${stableKey}`, // Per-page storage
  });

  const ChatOverlayComponent = config.ChatOverlayComponent || FullscreenChatOverlay;
  // Load font size preference
  useEffect(() => {
    if (!config.enableFontSize || !config.fontSizeStorageKey) return;
    
    const saved = localStorage.getItem(config.fontSizeStorageKey);
    if (saved === 'small' || saved === 'medium' || saved === 'large') {
      setFontSize(saved);
    }
  }, [config.enableFontSize, config.fontSizeStorageKey]);

  // Save font size preference
  const handleFontSizeChange = (size: FontSize) => {
    if (!config.fontSizeStorageKey) return;
    setFontSize(size);
    localStorage.setItem(config.fontSizeStorageKey, size);
  };

  // Load bootstrap data
  useEffect(() => {
    fetch(`${API_URL}${config.bootstrapUrl}`)
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
        config.onBootstrapLoaded?.(data);
        
        if (data.streamUrl) {
          initPlayer(data.streamUrl);
        } else {
          setStatus('offline');
        }
      })
      .catch(() => setStatus('offline'));
  }, [config.bootstrapUrl]);

  // Chat integration
  // Use real gameId if available, otherwise generate hash-based temporary gameId
  const effectiveGameId = bootstrap?.gameId || (bootstrap?.slug ? hashSlugSync(bootstrap.slug) : null);
  const viewer = useViewerIdentity({ 
    gameId: effectiveGameId,
    slug: bootstrap?.slug // Use bootstrap.slug, not config.slug
  });

  // Global viewer authentication for cross-stream support
  const globalAuth = useGlobalViewerAuth();

  // Auto-register if globally authenticated and no paywall
  useEffect(() => {
    // Skip if:
    // - Not bootstrapped yet
    // - No global auth
    // - Already unlocked locally
    // - Paywall is enabled
    // - Still loading global auth
    if (
      !bootstrap ||
      !globalAuth.isAuthenticated ||
      viewer.isUnlocked ||
      bootstrap.paywallEnabled ||
      globalAuth.isLoading
    ) {
      return;
    }

    const autoRegister = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/direct/viewer/auto-register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directStreamSlug: bootstrap.slug,
            viewerIdentityId: globalAuth.viewerIdentityId,
          }),
        });

        if (!response.ok) {
          console.error('Auto-registration failed:', response.status);
          return;
        }

        const data = await response.json();
        
        // Auto-registration completed, now unlock the viewer locally
        // This will call the unlock API which generates a viewer token
        if (data.registration?.viewerIdentity) {
          viewer.unlock({
            email: data.registration.viewerIdentity.email,
            firstName: data.registration.viewerIdentity.firstName || '',
            lastName: data.registration.viewerIdentity.lastName || '',
          }).catch(() => {
            // If unlock fails, log it but don't fail the auto-registration
            console.log('Auto-registration completed, but local unlock skipped');
          });
        }

        console.log('[DirectStreamPageBase] Auto-registered viewer for stream:', {
          slug: bootstrap.slug,
          isNewRegistration: data.isNewRegistration,
        });
      } catch (error) {
        console.error('[DirectStreamPageBase] Auto-registration error:', error);
      }
    };

    void autoRegister();
  }, [bootstrap, globalAuth.isAuthenticated, globalAuth.viewerIdentityId, globalAuth.isLoading, viewer.isUnlocked, API_URL]);

  // Handler for viewer registration via v2 modal
  const handleViewerRegister = async (email: string, name: string) => {
    // Parse name into firstName and lastName
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      // Unlock the viewer locally (calls the unlock API)
      await viewer.unlock({ email, firstName, lastName });
      
      // After successful unlock, save to global auth for cross-stream access
      if (viewer.viewerId) {
        globalAuth.setViewerAuth({
          viewerIdentityId: viewer.viewerId,
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          // registeredAt is auto-added by setViewerAuth
        });
      }
      
      setShowViewerAuthModal(false);
    } catch (error) {
      console.error('Viewer registration failed:', error);
      // Don't close modal on error
      throw error; // Re-throw so the form can handle it
    }
  };

  // Chat is always enabled to show messages, but sending requires unlock
  const chat = useGameChat({
    gameId: effectiveGameId,
    viewerToken: viewer.token,
    enabled: bootstrap?.chatEnabled === true, // Always enabled when chat is enabled
  });

  // v2 Chat hook (adapter for v2 Chat component)
  const chatV2 = useGameChatV2({
    gameId: effectiveGameId,
    viewerToken: viewer.token,
    enabled: bootstrap?.chatEnabled === true,
    currentUserId: viewer.token || undefined,
  });

  // v2 Scoreboard hook (data fetching for v2 Scoreboard component)
  const scoreboardData = useScoreboardData({
    slug: bootstrap?.slug || null,
    enabled: bootstrap?.scoreboardEnabled === true,
    viewerToken: viewer.token,
  });

  // Notify status changes
  useEffect(() => {
    config.onStreamStatusChange?.(status);
  }, [status, config]);

  // HLS player initialization
  function initPlayer(url: string) {
    const video = videoRef.current;
    if (!video) return;

    setStatus('loading');

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

  // Keyboard shortcuts: F for fullscreen, C for chat overlay (in fullscreen), S for scoreboard, Escape to close chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreenV2(); // Use v2 hook
      }

      // C toggles chat in fullscreen mode (overlay)
      if ((e.key === 'c' || e.key === 'C') && isFullscreen && viewer.isUnlocked) {
        e.preventDefault();
        setIsChatOverlayVisible(!isChatOverlayVisible);
      }

      // C toggles chat in normal mode (corner peek)
      if ((e.key === 'c' || e.key === 'C') && !isFullscreen && bootstrap?.chatEnabled) {
        e.preventDefault();
        setIsChatOpen(!isChatOpen);
      }

      // S toggles scoreboard in fullscreen mode
      if ((e.key === 's' || e.key === 'S') && isFullscreen && bootstrap?.scoreboardEnabled) {
        e.preventDefault();
        setIsScoreboardOverlayVisible(!isScoreboardOverlayVisible);
      }

      // S toggles scoreboard collapse in non-fullscreen mode
      if ((e.key === 's' || e.key === 'S') && !isFullscreen && bootstrap?.scoreboardEnabled) {
        e.preventDefault();
        scoreboardPanel.toggle();
      }

      // C toggles chat collapse in non-fullscreen mode (if not already handled)
      if ((e.key === 'c' || e.key === 'C') && !isFullscreen && bootstrap?.chatEnabled && !isChatOpen) {
        e.preventDefault();
        chatPanel.toggle();
      }

      // Escape closes chat
      if (e.key === 'Escape' && isChatOpen) {
        e.preventDefault();
        setIsChatOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isChatOverlayVisible, isScoreboardOverlayVisible, isChatOpen, viewer.isUnlocked, bootstrap?.chatEnabled, bootstrap?.scoreboardEnabled, scoreboardPanel.toggle, chatPanel.toggle, toggleFullscreenV2]);

  return (
    <div className={`min-h-screen bg-black flex flex-col ${config.containerClassName || ''}`}>
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full gap-4 p-4">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className={`bg-card border-b border-border p-4 rounded-t-lg ${config.headerClassName || ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{config.title}</h1>
                {config.subtitle && <p className="text-muted-foreground text-sm">{config.subtitle}</p>}
              </div>
              <div className="flex items-center gap-3">
                {config.enableFontSize && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Text:</span>
                    {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          fontSize === size
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {size[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    data-testid="btn-open-admin-panel"
                  >
                    Admin Panel
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form - Use AdminPanel */}
          {isEditing && (
            <div className="bg-card border-b border-border p-4">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-medium">Stream Settings</h2>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setMessage('');
                    }}
                    className="text-muted-foreground hover:text-white text-sm"
                    data-testid="btn-close-edit"
                  >
                    Close ✕
                  </button>
                </div>
                <AdminPanel
                  slug={bootstrap?.slug || ''}
                  initialSettings={{
                    streamUrl: bootstrap?.streamUrl,
                    chatEnabled: bootstrap?.chatEnabled,
                    paywallEnabled: bootstrap?.paywallEnabled,
                    priceInCents: bootstrap?.priceInCents,
                    paywallMessage: bootstrap?.paywallMessage,
                    allowSavePayment: bootstrap?.allowSavePayment,
                    scoreboardEnabled: bootstrap?.scoreboardEnabled,
                    homeTeamName: bootstrap?.scoreboardHomeTeam || undefined,
                    awayTeamName: bootstrap?.scoreboardAwayTeam || undefined,
                    homeJerseyColor: bootstrap?.scoreboardHomeColor || undefined,
                    awayJerseyColor: bootstrap?.scoreboardAwayColor || undefined,
                  }}
                  onAuthSuccess={(jwt) => {
                    setAdminJwt(jwt);
                    setIsAdmin(true);
                  }}
                />
                
                {/* Social Producer Panel */}
                <div className="mt-6">
                  <SocialProducerPanel
                    slug={bootstrap?.slug || ''}
                    isAdmin={isAdmin}
                    adminJwt={adminJwt || undefined}
                  />
                </div>

                {/* Viewer Analytics Panel */}
                <div className="mt-6">
                  <ViewerAnalyticsPanel slug={bootstrap?.slug || ''} />
                </div>
              </div>
            </div>
          )}

          {/* Scoreboard Overlay (non-fullscreen - collapsible to left edge) */}
          {!isFullscreen && bootstrap?.scoreboardEnabled && (
            <>
              {/* Collapsed: Left-edge tab */}
              {scoreboardPanel.isCollapsed && (
              <button
                type="button"
                data-testid="btn-expand-scoreboard"
                className={cn(
                  'fixed left-0 top-1/2 -translate-y-1/2 z-30',
                  'w-12 py-4',
                  'bg-background/95 backdrop-blur-sm',
                  'border-r-2 border-outline',
                  'rounded-r-lg',
                  'shadow-xl',
                  'cursor-pointer pointer-events-auto',
                  'hover:bg-background hover:w-14',
                  'transition-all duration-200',
                  'flex flex-col items-center gap-2'
                )}
                onClick={scoreboardPanel.toggle}
                aria-label="Expand scoreboard"
              >
                  <div className="text-white/80 text-xs font-bold">→</div>
                  <div className="text-2xl">📊</div>
                </button>
              )}

              {/* Expanded Scoreboard Panel */}
              {!scoreboardPanel.isCollapsed && (
              <div
                className={cn(
                  'fixed left-0 top-1/2 -translate-y-1/2 z-30',
                  'w-[320px]',
                  'bg-background/95 backdrop-blur-sm',
                  'border-r-2 border-outline',
                  'rounded-r-lg shadow-xl',
                  'transition-transform duration-300 ease-in-out',
                  'p-4'
                )}
                data-testid="scoreboard-panel"
                role="dialog"
                aria-modal="false"
                aria-label="Scoreboard panel"
              >
                  {/* Header with collapse button */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Scoreboard</h3>
                    <button
                      type="button"
                      className="text-white/70 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
                      onClick={scoreboardPanel.toggle}
                      aria-label="Collapse scoreboard"
                      data-testid="btn-collapse-scoreboard"
                    >
                      <div className="text-lg">←</div>
                    </button>
                  </div>

                  {/* v2 Scoreboard Component */}
                  <Scoreboard
                    homeTeam={scoreboardData.homeTeam}
                    awayTeam={scoreboardData.awayTeam}
                    period={scoreboardData.period}
                    time={scoreboardData.time}
                    mode="sidebar"
                    editable={viewer.isUnlocked}
                    onScoreUpdate={scoreboardData.updateScore}
                    data-testid="scoreboard-v2"
                  />

                  {scoreboardData.error && (
                    <div className="mt-4 p-3 bg-destructive/20 text-destructive rounded-lg text-sm">
                      {scoreboardData.error}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Paywall Modal */}
          {bootstrap?.paywallEnabled && (
            <PaywallModal
              slug={bootstrap.slug}
              isOpen={showPaywall}
              onClose={() => setShowPaywall(false)}
              onSuccess={() => {
                setShowPaywall(false);
                // TODO: Mark user as paid and allow access
              }}
              priceInCents={bootstrap.priceInCents || 0}
              paywallMessage={bootstrap.paywallMessage}
              allowSavePayment={bootstrap.allowSavePayment}
            />
          )}

          {/* Video Player Container */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              ref={containerRef}
              className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
              style={{ minHeight: '400px' }}
            >
              {status === 'offline' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-xl mb-2">Stream Offline</p>
                    <p className="text-sm text-muted-foreground mb-4">No stream URL configured</p>
                    <Button
                      onClick={() => setIsEditing(true)}
                      data-testid="btn-set-stream"
                    >
                      Set Stream URL
                    </Button>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-xl mb-2">Unable to Load Stream</p>
                    <p className="text-sm text-muted-foreground mb-4">Please check the stream URL and try again.</p>
                    <Button
                      onClick={() => setIsEditing(true)}
                      data-testid="btn-update-stream"
                    >
                      Update Stream URL
                    </Button>
                  </div>
                </div>
              )}

              {status === 'loading' && bootstrap?.streamUrl && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                  <div className="text-center text-white">
                    <p className="text-xl mb-2">Loading stream...</p>
                  </div>
                </div>
              )}

              {/* v2 Video Player */}
              <VideoPlayer
                ref={videoRef}
                src={bootstrap?.streamUrl || ''}
                autoPlay
                muted={isMuted}
                playsInline
                controls={false} // We'll use custom controls
                onPlay={() => setStatus('playing')}
                onPause={() => {}}
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  setCurrentTime(video.currentTime);
                }}
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  setDuration(video.duration);
                  setStatus('playing');
                }}
                onError={() => setStatus('error')}
                data-testid="video-player"
              />

              {/* v2 Video Controls (outside video container, below it) */}
              {bootstrap?.streamUrl && status !== 'offline' && status !== 'error' && (
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <VideoControls
                    isPlaying={status === 'playing'}
                    isMuted={isMuted}
                    volume={volume}
                    currentTime={currentTime}
                    duration={duration}
                    onPlayPause={() => {
                      if (videoRef.current) {
                        if (status === 'playing') {
                          videoRef.current.pause();
                          setStatus('loading');
                        } else {
                          videoRef.current.play();
                          setStatus('playing');
                        }
                      }
                    }}
                    onMuteToggle={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                    onVolumeChange={(newVolume) => {
                      if (videoRef.current) {
                        videoRef.current.volume = newVolume;
                        setVolume(newVolume);
                      }
                    }}
                    onSeek={(time) => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = time;
                      }
                    }}
                    onFullscreenToggle={toggleFullscreenV2}
                  />
                </div>
              )}

              {/* Fullscreen Chat Overlay (right side) */}
              {viewer.isUnlocked && bootstrap?.chatEnabled && bootstrap.gameId && isFullscreen && (
                <ChatOverlayComponent
                  chat={chat}
                  isVisible={isChatOverlayVisible}
                  onToggle={() => setIsChatOverlayVisible(!isChatOverlayVisible)}
                  position="right"
                  fontSize={config.enableFontSize ? fontSize : undefined}
                />
              )}

              {/* Fullscreen Registration Overlay (for unregistered users) */}
              {!viewer.isUnlocked && bootstrap?.chatEnabled && isFullscreen && (
                <FullscreenRegistrationOverlay
                  viewer={viewer}
                  isVisible={isChatOverlayVisible}
                  onToggle={() => setIsChatOverlayVisible(!isChatOverlayVisible)}
                  position="right"
                />
              )}

              {/* Fullscreen Collapsible Scoreboard Overlay (left side) */}
              {isFullscreen && bootstrap?.scoreboardEnabled && (
                <CollapsibleScoreboardOverlay
                  slug={bootstrap.slug}
                  isVisible={isScoreboardOverlayVisible}
                  onToggle={() => setIsScoreboardOverlayVisible(!isScoreboardOverlayVisible)}
                  position="left"
                  isFullscreen={isFullscreen}
                  canEditScore={viewer.isUnlocked}
                  viewerToken={viewer.token}
                />
              )}

              {/* Mobile Control Bar (touch devices only) */}
              {isTouch && (
                <MobileControlBar
                  scoreboardEnabled={bootstrap?.scoreboardEnabled || false}
                  homeScore={0} // TODO: Get from scoreboard API
                  awayScore={0} // TODO: Get from scoreboard API
                  onScoreboardToggle={() => {
                    if (isFullscreen) {
                      setIsScoreboardOverlayVisible(!isScoreboardOverlayVisible);
                    } else {
                      scoreboardPanel.toggle();
                    }
                  }}
                  chatEnabled={bootstrap?.chatEnabled || false}
                  chatBadgeCount={chat.messages.length}
                  onChatToggle={() => {
                    if (isFullscreen) {
                      setIsChatOverlayVisible(!isChatOverlayVisible);
                    } else {
                      chatPanel.toggle();
                    }
                  }}
                  isFullscreen={isFullscreen}
                  onFullscreenToggle={toggleFullscreenV2} // Use v2 hook
                  autoHide={isFullscreen}
                  autoHideDelay={4000}
                />
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-muted-foreground text-xs">
              <p>
                Powered by FieldView.Live • Share:{' '}
                <strong>{config.sharePath}</strong>
              </p>
              {/* Keyboard shortcuts: Only show on non-touch devices */}
              {!isFullscreen && !isTouch && (
                <p className="mt-2">
                  💡 Press <kbd className="px-2 py-1 bg-secondary rounded text-secondary-foreground">F</kbd> for fullscreen
                  {bootstrap?.chatEnabled && (
                    <>, <kbd className="px-2 py-1 bg-secondary rounded text-secondary-foreground">C</kbd> to collapse/expand chat</>
                  )}
                  {bootstrap?.scoreboardEnabled && (
                    <>, <kbd className="px-2 py-1 bg-secondary rounded text-secondary-foreground">S</kbd> to collapse/expand scoreboard</>
                  )}
                </p>
              )}
              {/* Touch-friendly hint */}
              {!isFullscreen && isTouch && (
                <p className="mt-2">
                  💡 Tap video for controls • Tap 📊 for score • Tap 💬 to chat
                </p>
              )}
            </div>
          </div>

          {/* Custom children content */}
          {children}
        </div>

        {/* Collapsible Chat Panel - Right Edge */}
        {!isFullscreen && bootstrap?.chatEnabled && (
          <>
            {/* Collapsed: Right-edge tab */}
            {chatPanel.isCollapsed && (
              <button
                type="button"
                data-testid="btn-expand-chat"
                className={cn(
                  'fixed right-0 top-1/2 -translate-y-1/2 z-30',
                  'w-12 py-4',
                  'bg-background/95 backdrop-blur-sm',
                  'border-l-2 border-outline',
                  'rounded-l-lg',
                  'shadow-xl',
                  'cursor-pointer pointer-events-auto',
                  'hover:bg-background hover:w-14',
                  'transition-all duration-200',
                  'flex flex-col items-center gap-2'
                )}
                onClick={chatPanel.toggle}
                aria-label="Expand chat"
              >
                <div className="text-white/80 text-xs font-bold">←</div>
                <div className="text-2xl">💬</div>
                {chat.messages.length > 0 && (
                  <div 
                    className="text-white font-bold text-xs bg-accent/80 px-2 py-0.5 rounded-full"
                    data-testid="chat-collapsed-badge"
                  >
                    {chat.messages.length > 9 ? '9+' : chat.messages.length}
                  </div>
                )}
                {chat.isConnected && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </button>
            )}

            {/* Expanded Chat Panel */}
            {!chatPanel.isCollapsed && (
              <div
                className={cn(
                  'fixed right-0 top-1/2 -translate-y-1/2 z-30',
                  'w-[360px] max-h-[80vh]',
                  'bg-background/95 backdrop-blur-sm',
                  'border-l-2 border-outline',
                  'rounded-l-lg shadow-xl',
                  'flex flex-col',
                  'transition-transform duration-300 ease-in-out'
                )}
                data-testid="chat-panel"
                role="dialog"
                aria-modal="false"
                aria-label="Chat panel"
              >
                {/* Header with collapse button */}
                <div className="p-4 border-b border-outline flex items-center justify-between relative">
                  {/* Collapse button - Top left */}
                  <button
                    onClick={chatPanel.toggle}
                    className="absolute -left-10 top-2 w-8 h-8 bg-background/95 backdrop-blur-sm border border-outline rounded-l-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-background transition-colors"
                    data-testid="btn-collapse-chat"
                    aria-label="Collapse chat"
                  >
                    <span className="text-xs font-bold">→</span>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-base">Live Chat</h2>
                    {chat.isConnected ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Connecting...</span>
                    )}
                  </div>
                </div>

                {/* Content - Always show messages, conditionally show input */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {/* v2 Chat Component */}
                  {viewer.isUnlocked ? (
                    <Chat
                      messages={chatV2.messages}
                      onSend={chatV2.sendMessage}
                      currentUserId={chatV2.currentUserId}
                      mode="embedded"
                      title=""
                      isLoading={chatV2.isLoading}
                      disabled={!chatV2.isConnected}
                      emptyMessage="No messages yet. Be the first to chat!"
                      className="h-full"
                      data-testid="chat-panel-v2"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col">
                      {/* Show messages to unregistered users (read-only) */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="list-chat-messages">
                        {chat.error && (
                          <div className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm" role="alert">
                            {chat.error}
                          </div>
                        )}
                        
                        {chat.messages.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8 text-sm">
                            No messages yet. Be the first to chat!
                          </p>
                        ) : (
                          chat.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className="p-3 bg-muted/50 rounded-lg"
                              data-testid={`chat-msg-${msg.id}`}
                            >
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                {msg.displayName}
                              </div>
                              <div className="text-sm leading-relaxed break-words text-white">
                                {msg.message}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Registration prompt for unregistered users */}
                      <div className="border-t border-outline p-4 bg-background/50">
                        {!showInlineRegistration ? (
                          <div className="space-y-3 text-center">
                            <p className="text-sm text-muted-foreground">
                              Register your email to send messages
                            </p>
                            <Button
                              onClick={() => setShowInlineRegistration(true)}
                              data-testid="btn-open-inline-registration"
                              className="w-full"
                            >
                              Register to Chat
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Inline Registration Form */}
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-semibold text-white">Join the Chat</h3>
                              <button
                                onClick={() => setShowInlineRegistration(false)}
                                className="text-muted-foreground hover:text-white transition-colors"
                                data-testid="btn-cancel-inline-registration"
                                aria-label="Cancel registration"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Register your email to start chatting
                            </p>
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const displayName = formData.get('displayName') as string;
                                const email = formData.get('email') as string;
                                
                                if (!displayName || !email) return;
                                
                                await handleViewerRegister({
                                  displayName,
                                  email,
                                  firstName: displayName.split(' ')[0] || displayName,
                                  lastName: displayName.split(' ').slice(1).join(' ') || '',
                                });
                                
                                // Close form on success
                                setShowInlineRegistration(false);
                              }}
                              className="space-y-3"
                            >
                              <div>
                                <label htmlFor="inline-displayName" className="sr-only">Display Name</label>
                                <Input
                                  id="inline-displayName"
                                  name="displayName"
                                  type="text"
                                  placeholder="Your name"
                                  required
                                  className="w-full bg-background/80 border-outline text-white placeholder:text-white/50"
                                  data-testid="input-inline-displayName"
                                  defaultValue={globalAuth.viewerIdentity?.firstName && globalAuth.viewerIdentity?.lastName 
                                    ? `${globalAuth.viewerIdentity.firstName} ${globalAuth.viewerIdentity.lastName}` 
                                    : globalAuth.viewerIdentity?.firstName || ''}
                                />
                              </div>
                              <div>
                                <label htmlFor="inline-email" className="sr-only">Email Address</label>
                                <Input
                                  id="inline-email"
                                  name="email"
                                  type="email"
                                  placeholder="you@example.com"
                                  required
                                  className="w-full bg-background/80 border-outline text-white placeholder:text-white/50"
                                  data-testid="input-inline-email"
                                  defaultValue={globalAuth.viewerIdentity?.email || ''}
                                />
                              </div>
                              <Button
                                type="submit"
                                disabled={viewer.isLoading || globalAuth.isAutoRegistering}
                                className="w-full"
                                data-testid="btn-submit-inline-registration"
                              >
                                {viewer.isLoading || globalAuth.isAutoRegistering ? 'Registering...' : 'Register'}
                              </Button>
                              {(viewer.error || globalAuth.autoRegisterError) && (
                                <p className="text-xs text-destructive text-center" role="alert">
                                  {viewer.error || globalAuth.autoRegisterError}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground text-center">
                                We'll send you a secure link to verify your email. No password required!
                              </p>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* v2 Viewer Auth Modal */}
        <ViewerAuthModal
          isOpen={showViewerAuthModal}
          onClose={() => setShowViewerAuthModal(false)}
          onRegister={handleViewerRegister}
          isLoading={viewer.isLoading}
          error={viewer.error}
          title="Join the Chat"
          description="Register your email to start chatting"
          defaultEmail={globalAuth.viewerEmail || ''}
          defaultName={globalAuth.viewerName || ''}
        />
      </div>
    </div>
  );
}

