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

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Hls from 'hls.js';
import { MessageCircle, X } from 'lucide-react';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { GameChatPanel } from '@/components/GameChatPanel';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';
import { FullscreenChatOverlay } from '@/components/FullscreenChatOverlay';
import { AdminPanel } from '@/components/AdminPanel';
import { SocialProducerPanel } from '@/components/SocialProducerPanel';
import { ScoreboardOverlay } from '@/components/ScoreboardOverlay';
import { ViewerAnalyticsPanel } from '@/components/ViewerAnalyticsPanel';
import { PaywallModal } from '@/components/PaywallModal';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [adminJwt, setAdminJwt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

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
  const viewer = useViewerIdentity({ gameId: bootstrap?.gameId || null });
  const chat = useGameChat({
    gameId: bootstrap?.gameId || null,
    viewerToken: viewer.token,
    enabled: viewer.isUnlocked && bootstrap?.chatEnabled === true,
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

  // Save stream URL (admin)
  // Fullscreen management
  function toggleFullscreen() {
    const container = containerRef.current;
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

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts: F for fullscreen, C for chat overlay (in fullscreen), Escape to close chat
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

      // Escape closes chat
      if (e.key === 'Escape' && isChatOpen) {
        e.preventDefault();
        setIsChatOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isChatOverlayVisible, isChatOpen, viewer.isUnlocked, bootstrap?.chatEnabled]);

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
                    data-testid="btn-edit-stream"
                  >
                    Edit Stream
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

          {/* Scoreboard Overlay (visible to all viewers) */}
          <ScoreboardOverlay slug={bootstrap?.slug || ''} />

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

              {/* Fullscreen Chat Overlay */}
              {viewer.isUnlocked && bootstrap?.chatEnabled && bootstrap.gameId && isFullscreen && (
                <ChatOverlayComponent
                  chat={chat}
                  isVisible={isChatOverlayVisible}
                  onToggle={() => setIsChatOverlayVisible(!isChatOverlayVisible)}
                  position="right"
                  fontSize={config.enableFontSize ? fontSize : undefined}
                />
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-muted-foreground text-xs">
              <p>
                Powered by FieldView.Live • Share:{' '}
                <strong>{config.sharePath}</strong>
              </p>
              {!isFullscreen && (
                <p className="mt-2">
                  💡 Press <kbd className="px-2 py-1 bg-secondary rounded text-secondary-foreground">F</kbd> for fullscreen
                  {bootstrap?.chatEnabled && (
                    <>, <kbd className="px-2 py-1 bg-secondary rounded text-secondary-foreground">C</kbd> to toggle chat</>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Custom children content */}
          {children}
        </div>

        {/* Corner Peek Chat - Glass Expansion */}
        {!isFullscreen && bootstrap?.chatEnabled && bootstrap.gameId && (
          <>
            {/* Backdrop */}
            {isChatOpen && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ease-standard"
                onClick={() => setIsChatOpen(false)}
                data-testid="chat-backdrop"
                aria-hidden="true"
              />
            )}

            {/* Floating Chat Badge (Collapsed) */}
            {!isChatOpen && (
              <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 glass border border-primary/20 rounded-full shadow-elevation-2 hover:shadow-elevation-3 hover:border-primary/30 transition-all duration-fast ease-standard flex items-center justify-center group"
                data-testid="btn-open-chat"
                aria-label="Open chat"
              >
                <svg
                  className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-fast"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                
                {/* Activity indicator (shows if chat is connected and has messages) */}
                {chat.isConnected && chat.messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                    {chat.messages.length > 9 ? '9+' : chat.messages.length}
                  </span>
                )}
              </button>
            )}

            {/* Expanded Chat Panel */}
            {isChatOpen && (
              <div
                className={`fixed bottom-6 right-6 z-50 w-[360px] h-[500px] glass border border-primary/20 rounded-lg shadow-elevation-3 flex flex-col transition-all duration-300 ease-standard origin-bottom-right ${
                  isChatOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                }`}
                data-testid="chat-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Chat panel"
              >
                {/* Header */}
                <div className="p-4 border-b border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-base">Live Chat</h2>
                    {chat.isConnected ? (
                      <span className="flex items-center gap-1 text-success text-xs">
                        <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Connecting...</span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="text-muted-foreground hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                    data-testid="btn-close-chat"
                    aria-label="Close chat"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 p-4 overflow-hidden">
                  {!viewer.isUnlocked ? (
                    <ViewerUnlockForm
                      onUnlock={viewer.unlock}
                      isLoading={viewer.isLoading}
                      error={viewer.error}
                      title="Join the conversation"
                      description="Enter your info to chat with other viewers"
                    />
                  ) : (
                    <div className="h-full">
                      <GameChatPanel chat={chat} className="h-full" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

