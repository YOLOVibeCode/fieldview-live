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
import { CollapsibleScoreboardOverlay } from '@/components/CollapsibleScoreboardOverlay';
import { ViewerAnalyticsPanel } from '@/components/ViewerAnalyticsPanel';
import { PaywallModal } from '@/components/PaywallModal';
import { Button } from '@/components/ui/button';
import { useCollapsiblePanel } from '@/hooks/useCollapsiblePanel';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { ChatMessage } from '@/hooks/useGameChat';
import { hashSlugSync } from '@/lib/hashSlug';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [adminJwt, setAdminJwt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Collapsible panel state (non-fullscreen mode)
  // Use stable slug from config or bootstrap once loaded
  const stableSlug = bootstrap?.slug || config.bootstrapUrl.split('/').pop() || 'default';
  
  const scoreboardPanel = useCollapsiblePanel({
    edge: 'left',
    defaultCollapsed: true, // Collapsed by default
    storageKey: `scoreboard-collapsed-${stableSlug}`,
  });

  const chatPanel = useCollapsiblePanel({
    edge: 'right',
    defaultCollapsed: true, // Collapsed by default
    storageKey: `chat-collapsed-${stableSlug}`, // Per-page storage
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
  const viewer = useViewerIdentity({ gameId: effectiveGameId });
  // Chat is always enabled to show messages, but sending requires unlock
  const chat = useGameChat({
    gameId: effectiveGameId,
    viewerToken: viewer.token,
    enabled: bootstrap?.chatEnabled === true, // Always enabled when chat is enabled
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

  // Keyboard shortcuts: F for fullscreen, C for chat overlay (in fullscreen), S for scoreboard, Escape to close chat
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
  }, [isFullscreen, isChatOverlayVisible, isScoreboardOverlayVisible, isChatOpen, viewer.isUnlocked, bootstrap?.chatEnabled, bootstrap?.scoreboardEnabled, scoreboardPanel.toggle, chatPanel.toggle]);

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

          {/* Scoreboard Overlay (non-fullscreen - collapsible to left edge) */}
          {!isFullscreen && bootstrap?.scoreboardEnabled && (
            <ScoreboardOverlay 
              slug={bootstrap?.slug || ''} 
              isCollapsed={scoreboardPanel.isCollapsed}
              onToggle={scoreboardPanel.toggle}
            />
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

              {/* Fullscreen Collapsible Scoreboard Overlay (left side) */}
              {isFullscreen && bootstrap?.scoreboardEnabled && (
                <CollapsibleScoreboardOverlay
                  slug={bootstrap.slug}
                  isVisible={isScoreboardOverlayVisible}
                  onToggle={() => setIsScoreboardOverlayVisible(!isScoreboardOverlayVisible)}
                  position="left"
                  isFullscreen={isFullscreen}
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
                    <>, <kbd className="px-2 py-1 bg-secondary rounded text-secondary-foreground">C</kbd> to collapse/expand chat</>
                  )}
                  {bootstrap?.scoreboardEnabled && (
                    <>, <kbd className="px-2 py-1 bg-secondary rounded text-secondary-foreground">S</kbd> to collapse/expand scoreboard</>
                  )}
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
              <div
                data-testid="chat-collapsed-tab"
                className={cn(
                  'fixed right-0 top-1/2 -translate-y-1/2 z-50',
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
                role="button"
                aria-label="Expand chat"
              >
                <div className="text-white/80 text-xs font-bold">→</div>
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
              </div>
            )}

            {/* Expanded Chat Panel */}
            {!chatPanel.isCollapsed && (
              <div
                className={cn(
                  'fixed right-0 top-1/2 -translate-y-1/2 z-50',
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
                  {/* Messages - Always visible to all viewers */}
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

                  {/* Input area - Only for unlocked users */}
                  <div className="border-t border-outline p-4 bg-background/50">
                    {viewer.isUnlocked ? (
                      <ChatMessageForm chat={chat} />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground text-center">
                          Register your email to send messages
                        </p>
                        <ViewerUnlockForm
                          onUnlock={viewer.unlock}
                          isLoading={viewer.isLoading}
                          error={viewer.error}
                          title=""
                          description=""
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

