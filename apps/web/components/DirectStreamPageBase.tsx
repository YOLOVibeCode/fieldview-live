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
import { useCollapsiblePanel } from '@/hooks/useCollapsiblePanel';
import { usePaywall } from '@/hooks/usePaywall';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { ChatMessage } from '@/hooks/useGameChat';
import { hashSlugSync } from '@/lib/hashSlug';
import type { 
  DirectStreamBootstrapResponse,
  DirectStreamStreamConfig 
} from '@/lib/types/directStream';
import { getStreamStatusMessage, isStreamPlayable } from '@/lib/types/directStream';
// Legacy components (needed for Admin Panel)
import { AdminPanel } from '@/components/AdminPanel';
import { SocialProducerPanel } from '@/components/SocialProducerPanel';
import { ViewerAnalyticsPanel } from '@/components/ViewerAnalyticsPanel';
import { PaywallModal } from '@/components/PaywallModal';
// v2 Components
import { VideoContainer, VideoPlayer, VideoControls } from '@/components/v2/video';
import { useFullscreen } from '@/hooks/v2/useFullscreen';
import { Chat } from '@/components/v2/chat';
import { Scoreboard } from '@/components/v2/scoreboard';
import { useScoreboardData } from '@/hooks/useScoreboardData';
import { ViewerAuthModal } from '@/components/v2/auth';
import { TouchButton, Badge, BottomSheet } from '@/components/v2/primitives';
import { useResponsive } from '@/hooks/v2/useResponsive';
// Debug components
import { ChatDebugPanel } from '@/components/ChatDebugPanel';
import { ConnectionDebugPanel } from '@/components/debug/ConnectionDebugPanel';
import { useStreamDebug } from '@/hooks/useStreamDebug';
import { useApiHealth } from '@/hooks/useApiHealth';
import { initDebugTools } from '@/lib/debug/init';

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
        <TouchButton
          type="submit"
          disabled={!canSend || !chat.isConnected}
          data-testid="btn-send-message"
          className="min-h-[44px] min-w-[80px] text-base font-medium"
          variant="primary"
          aria-label="Send message"
        >
          Send
        </TouchButton>
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
  const hlsRef = useRef<Hls | null>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [streamConfig, setStreamConfig] = useState<DirectStreamStreamConfig | null>(null);
  const [streamMessage, setStreamMessage] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'offline' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [isChatOverlayVisible, setIsChatOverlayVisible] = useState(false);
  const [isScoreboardOverlayVisible, setIsScoreboardOverlayVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [adminJwt, setAdminJwt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showViewerAuthModal, setShowViewerAuthModal] = useState(false);
  const [showInlineRegistration, setShowInlineRegistration] = useState(false);

  // Video control state (v2)
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Fullscreen hook (v2)
  const { isFullscreen, toggleFullscreen: toggleFullscreenV2, isSupported: isFullscreenSupported } = useFullscreen(containerRef.current);

  // v2 Responsive hook (replaces manual detection)
  const { isMobile, isTouch, breakpoint } = useResponsive();

  // Paywall hook - manages paywall state based on bootstrap
  const paywall = usePaywall({
    slug: bootstrap?.slug || config.slug || '',
    enabled: false, // We use bootstrap data directly, not API fetch
    demoMode: false,
  });

  // Debug hooks
  const streamDebug = useStreamDebug(hlsRef.current, videoRef.current, streamConfig?.url || null);
  const apiHealth = useApiHealth(bootstrap?.slug || null);
  
  // Initialize debug tools on mount
  useEffect(() => {
    initDebugTools();
  }, []);

  // Track metrics
  const [metrics, setMetrics] = useState({
    pageLoadTime: typeof window !== 'undefined' ? performance.now() : 0,
    bootstrapFetchTime: undefined as number | undefined,
    streamConnectTime: undefined as number | undefined,
    chatConnectTime: undefined as number | undefined,
    totalActiveTime: 0,
    timestamp: new Date(),
  });

  // Track bootstrap fetch time
  useEffect(() => {
    if (bootstrap) {
      const fetchTime = performance.now() - metrics.pageLoadTime;
      setMetrics(prev => ({ ...prev, bootstrapFetchTime: fetchTime }));
    }
  }, [bootstrap]);

  // Track stream connect time
  useEffect(() => {
    if (status === 'playing' && !metrics.streamConnectTime) {
      const connectTime = performance.now() - metrics.pageLoadTime;
      setMetrics(prev => ({ ...prev, streamConnectTime: connectTime }));
    }
  }, [status]);

  // Track chat connect time
  useEffect(() => {
    if (chat.isConnected && !metrics.chatConnectTime) {
      const connectTime = performance.now() - metrics.pageLoadTime;
      setMetrics(prev => ({ ...prev, chatConnectTime: connectTime }));
    }
  }, [chat.isConnected]);

  // Update total active time
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalActiveTime: performance.now() - prev.pageLoadTime,
        timestamp: new Date(),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track if paywall check is complete
  const [paywallChecked, setPaywallChecked] = useState(false);
  
  // Compute isBlocked based on bootstrap and paywall state
  // This overrides the hook's internal calculation since we have bootstrap data
  const isPaywallBlocked = bootstrap?.paywallEnabled && !paywall.hasPaid;

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
    const fullUrl = `${API_URL}${config.bootstrapUrl}`;
    console.log('[DirectStream] 🚀 Fetching bootstrap from:', fullUrl);
    setStatus('loading');
    
    fetch(fullUrl)
      .then((res) => {
        console.log('[DirectStream] 📡 Bootstrap response:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          url: res.url
        });
        
        if (res.status === 404) {
          console.warn('[DirectStream] 404: Stream not found');
          setStatus('offline');
          return null;
        }
        return res.json();
      })
      .then((data: DirectStreamBootstrapResponse | null) => {
        if (!data) {
          console.log('[DirectStream] No bootstrap data returned');
          return;
        }
        
        console.log('[DirectStream] ✅ Bootstrap loaded:', {
          slug: data.page?.slug || data.slug,
          streamStatus: data.stream?.status || 'not configured',
          streamUrl: data.stream?.url || null,
          title: data.page?.title || data.title,
          paywallEnabled: data.page?.paywallEnabled || data.paywallEnabled,
          chatEnabled: data.page?.chatEnabled || data.chatEnabled,
          scoreboardEnabled: data.page?.scoreboardEnabled || data.scoreboardEnabled
        });
        
        // ISP: Extract page config and stream config
        const pageConfig = data.page || data;  // Backward compatibility
        const stream = data.stream || null;
        
        // Store page config (with backward compatibility for flat structure)
        const bootstrapData: Bootstrap = {
          slug: pageConfig.slug,
          title: pageConfig.title,
          gameId: pageConfig.gameId,
          streamUrl: stream?.url || null,
          chatEnabled: pageConfig.chatEnabled,
          scoreboardEnabled: pageConfig.scoreboardEnabled,
          paywallEnabled: pageConfig.paywallEnabled,
          priceInCents: pageConfig.priceInCents,
          paywallMessage: pageConfig.paywallMessage,
          allowSavePayment: pageConfig.allowSavePayment,
          scoreboardHomeTeam: pageConfig.scoreboardHomeTeam,
          scoreboardAwayTeam: pageConfig.scoreboardAwayTeam,
          scoreboardHomeColor: pageConfig.scoreboardHomeColor,
          scoreboardAwayColor: pageConfig.scoreboardAwayColor,
          allowViewerScoreEdit: pageConfig.allowViewerScoreEdit,
          allowViewerNameEdit: pageConfig.allowViewerNameEdit,
        };
        
        setBootstrap(bootstrapData);
        setStreamConfig(stream);
        setStreamMessage(getStreamStatusMessage(stream));
        
        config.onBootstrapLoaded?.(bootstrapData);
        
        // Check paywall status before initializing player
        if (pageConfig.paywallEnabled) {
          // Check if user has already paid (localStorage)
          const storageKey = `paywall_${data.slug}`;
          const stored = localStorage.getItem(storageKey);
          const localHasPaid = stored ? JSON.parse(stored).hasPaid : false;
          
          if (localHasPaid) {
            console.log('[DirectStream] 💳 localStorage says paid, verifying with server...');
            
            // CRITICAL SECURITY: Verify with server before granting access
            // Get viewer identity from global auth or local viewer state
            const viewerId = globalAuth.viewerIdentityId || viewer.viewerId;
            const email = globalAuth.viewerEmail || viewer.email;
            
            // Build query params
            const params = new URLSearchParams();
            if (viewerId) params.append('viewerId', viewerId);
            else if (email) params.append('email', email);
            
            // Verify access with server
            const verifySlug = (pageConfig as any).slug || data.slug;
            fetch(`${API_URL}/api/direct/${verifySlug}/verify-access?${params.toString()}`)
              .then(res => res.json())
              .then(verifyResult => {
                if (verifyResult.hasAccess) {
                  console.log('[DirectStream] ✅ Server verified access, initializing player');
                  console.log('[DirectStream] 📝 Reason:', verifyResult.reason);
                  if (verifyResult.entitlement) {
                    console.log('[DirectStream] 🎫 Entitlement expires:', verifyResult.entitlement.expiresAt);
                  }
                  setPaywallChecked(true);
                  
                  // ISP: Check if stream is playable
                  if (stream && isStreamPlayable(stream)) {
                    console.log('[DirectStream] ▶️ Stream is playable, initializing player');
                    initPlayer(stream.url!);
                  } else {
                    console.warn('[DirectStream] ⚠️ Stream not playable:', stream?.status || 'not configured');
                    setStatus('offline');
                  }
                } else {
                  // Server says no access - localStorage is invalid
                  console.warn('[DirectStream] ⚠️ Server denied access:', verifyResult.reason);
                  console.warn('[DirectStream] 🧹 Clearing invalid localStorage state');
                  localStorage.removeItem(storageKey);
                  setPaywallChecked(true);
                  paywall.openPaywall();
                  setStatus('loading');
                }
              })
              .catch(err => {
                console.error('[DirectStream] ❌ Verification failed:', err);
                console.warn('[DirectStream] 🧹 Clearing localStorage due to verification error');
                // On error, be conservative: require payment
                localStorage.removeItem(storageKey);
                setPaywallChecked(true);
                paywall.openPaywall();
                setStatus('loading');
              });
          } else {
            console.log('[DirectStream] 🔒 Paywall enabled, showing paywall modal');
            setPaywallChecked(true);
            paywall.openPaywall();
            setStatus('loading'); // Keep loading until payment
          }
        } else {
          // No paywall - proceed normally
          setPaywallChecked(true);
          
          // ISP: Check if stream is playable
          if (stream && isStreamPlayable(stream)) {
            console.log('[DirectStream] ▶️ Stream is live, initializing player');
            initPlayer(stream.url!);
          } else if (stream?.status === 'offline') {
            console.log('[DirectStream] 📡 Stream is offline');
            setStatus('offline');
          } else if (stream?.status === 'scheduled') {
            console.log('[DirectStream] ⏰ Stream is scheduled');
            setStatus('offline');
          } else if (stream?.status === 'error') {
            console.log('[DirectStream] ❌ Stream error:', stream.errorMessage);
            setStatus('error');
          } else {
            // No stream configured
            console.log('[DirectStream] 🔧 No stream configured');
            setStatus('offline');
          }
        }
      })
      .catch((err) => {
        console.error('[DirectStream] ❌ Bootstrap fetch error:', err);
        setStatus('offline');
      });
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
          const viewerIdentity = data.registration.viewerIdentity;
          
          // Unlock and set global auth
          try {
            const result = await viewer.unlock({
              email: viewerIdentity.email,
              firstName: viewerIdentity.firstName || '',
              lastName: viewerIdentity.lastName || '',
            });
            
            // Update global auth with the viewerId for future cross-stream access
            if (result?.viewerId) {
              globalAuth.setViewerAuth({
                viewerIdentityId: result.viewerId,
                email: viewerIdentity.email,
                firstName: viewerIdentity.firstName || undefined,
                lastName: viewerIdentity.lastName || undefined,
              });
            }
          } catch {
            // If unlock fails, log it but don't fail the auto-registration
            console.log('[DirectStreamPageBase] Auto-registration completed, but local unlock failed');
          }
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
      // Unlock the viewer locally (calls the unlock API) - returns viewerId immediately
      const result = await viewer.unlock({ email, firstName, lastName });
      
      // After successful unlock, save to global auth for cross-stream access
      // Use the returned viewerId instead of viewer.viewerId (which is async state)
      if (result?.viewerId) {
        globalAuth.setViewerAuth({
          viewerIdentityId: result.viewerId,
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
    console.log('[DirectStream] 🎬 initPlayer called', { url, timestamp: new Date().toISOString() });
    
    const video = videoRef.current;
    if (!video) {
      console.error('[DirectStream] ❌ No video ref available');
      return;
    }

    console.log('[DirectStream] 📹 Video element state:', {
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      muted: video.muted,
      src: video.src
    });

    setStatus('loading');
    console.log('[DirectStream] 🔄 Status set to: loading');
    
    // Ensure video is muted for autoplay to work
    video.muted = isMuted;
    console.log('[DirectStream] 🔇 Video muted:', isMuted);

    if (Hls.isSupported()) {
      console.log('[DirectStream] ✅ HLS.js supported, initializing...');
      
      // Clear src BEFORE creating HLS instance
      video.removeAttribute('src');
      video.load(); // Reset the video element
      console.log('[DirectStream] 🧹 Cleared video src attribute for HLS.js');
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        debug: true, // TEMP: Enable debug logging to diagnose production issue
      });

      // Store HLS instance for debug hook (before loadSource)
      hlsRef.current = hls;

      console.log('[DirectStream] 📡 Loading source:', url);
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('[DirectStream] ✅ MANIFEST_PARSED', { 
          levels: data.levels?.length,
          firstLevel: data.firstLevel,
          video: data.video,
          audio: data.audio
        });
        setStatus('playing');
        console.log('[DirectStream] 🔄 Status set to: playing');
        
        // Autoplay will work because video is muted
        video.play()
          .then(() => {
            console.log('[DirectStream] ▶️ Video.play() succeeded');
          })
          .catch((err) => {
            console.log('[DirectStream] ⏸️ Autoplay blocked (user interaction required):', err.name, err.message);
            // Don't set error status for autoplay blocks - stream is loaded, just paused
          });
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log('[DirectStream] 📊 Level loaded:', {
          level: data.level,
          details: data.details?.live ? 'LIVE' : 'VOD'
        });
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log('[DirectStream] 🎞️ First fragment loaded:', {
          sn: data.frag.sn,
          duration: data.frag.duration,
          level: data.frag.level
        });
        // Only log first fragment to avoid spam
        hls.off(Hls.Events.FRAG_LOADED);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[DirectStream] ⚠️ HLS Error:', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          url: data.url,
          response: data.response,
          reason: data.reason
        });
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[DirectStream] 🌐 Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[DirectStream] 🎥 Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[DirectStream] ❌ Fatal error, cannot recover');
              hls.destroy();
              setStatus('error');
              break;
          }
        }
      });

      return () => {
        console.log('[DirectStream] 🧹 Destroying HLS instance');
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[DirectStream] 🍎 Native HLS support (Safari)');
      
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        console.log('[DirectStream] ✅ Native HLS loadedmetadata');
        setStatus('playing');
        
        // Autoplay will work because video is muted
        video.play()
          .then(() => {
            console.log('[DirectStream] ▶️ Native video.play() succeeded');
          })
          .catch((err) => {
            console.log('[DirectStream] ⏸️ Native autoplay blocked:', err.name, err.message);
            // Don't set error status for autoplay blocks - stream is loaded, just paused
          });
      });
      
      video.addEventListener('error', (e) => {
        // Only set error for actual media errors, not playback issues
        const mediaError = (e.target as HTMLVideoElement)?.error;
        console.error('[DirectStream] ❌ Native video error:', {
          code: mediaError?.code,
          message: mediaError?.message,
          MEDIA_ERR_ABORTED: mediaError?.code === MediaError.MEDIA_ERR_ABORTED,
          MEDIA_ERR_NETWORK: mediaError?.code === MediaError.MEDIA_ERR_NETWORK,
          MEDIA_ERR_DECODE: mediaError?.code === MediaError.MEDIA_ERR_DECODE,
          MEDIA_ERR_SRC_NOT_SUPPORTED: mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        });
        
        if (mediaError && mediaError.code !== MediaError.MEDIA_ERR_ABORTED) {
          console.error('[DirectStream] ❌ Setting error status');
          setStatus('error');
        }
      });
    } else {
      console.error('[DirectStream] ❌ HLS not supported in this browser');
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
    <div className={`min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col ${config.containerClassName || ''}`}>
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full gap-4 p-4">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header - Enhanced with gradient and backdrop blur */}
          <div className={`bg-black/60 backdrop-blur-md border-b border-white/10 p-4 rounded-t-lg shadow-2xl ${config.headerClassName || ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">{config.title}</h1>
                {config.subtitle && <p className="text-gray-400 text-sm">{config.subtitle}</p>}
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                {config.enableFontSize && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm hidden md:inline">Text:</span>
                    {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                      <TouchButton
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        size="sm"
                        variant={fontSize === size ? 'primary' : 'secondary'}
                        className={`transition-all ${
                          fontSize === size
                            ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20'
                            : 'hover:border-white/40'
                        }`}
                      >
                        {size[0].toUpperCase()}
                      </TouchButton>
                    ))}
                  </div>
                )}
                {!isEditing && (
                  <TouchButton
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    variant="secondary"
                    className="shadow-lg border border-white/20 hover:border-white/40 transition-all"
                    data-testid="btn-open-admin-panel"
                  >
                    Admin Panel
                  </TouchButton>
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
              {/* Collapsed: Left-edge tab - Enhanced with glow */}
              {scoreboardPanel.isCollapsed && (
              <button
                type="button"
                data-testid="btn-expand-scoreboard"
                className={cn(
                  'fixed left-0 top-1/2 -translate-y-1/2 z-30',
                  'w-12 py-4',
                  'bg-black/80 backdrop-blur-md',
                  'border-r-2 border-white/20',
                  'rounded-r-lg',
                  'shadow-2xl shadow-blue-500/10',
                  'cursor-pointer pointer-events-auto',
                  'hover:bg-black/90 hover:w-14 hover:border-white/40 hover:shadow-blue-500/30',
                  'transition-all duration-300',
                  'flex flex-col items-center gap-2',
                  'group'
                )}
                onClick={scoreboardPanel.toggle}
                aria-label="Expand scoreboard"
              >
                  <div className="text-white/60 text-xs font-bold group-hover:text-white/90 transition-colors">→</div>
                  <div className="text-2xl group-hover:scale-110 transition-transform">📊</div>
                  {/* Optional badge for active state */}
                  <div className="absolute -right-1 top-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </button>
              )}

              {/* Expanded Scoreboard Panel - Enhanced with depth */}
              {!scoreboardPanel.isCollapsed && (
              <div
                className={cn(
                  'fixed left-0 top-1/2 -translate-y-1/2 z-30',
                  'w-[320px]',
                  'bg-black/90 backdrop-blur-md',
                  'border-r-2 border-white/20',
                  'rounded-r-lg shadow-2xl shadow-blue-500/10',
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

                  {/* Only show error for critical failures (5xx), not missing data (404) */}
                  {scoreboardData.error && scoreboardData.error.includes('500') && (
                    <div 
                      className="mt-4 p-3 bg-destructive/20 text-destructive rounded-lg text-sm"
                      role="alert"
                      ref={(el) => {
                        if (el) {
                          console.error('[DirectStream] 🔴 RED ERROR DISPLAYED (Scoreboard):', {
                            type: 'scoreboard',
                            message: scoreboardData.error,
                            timestamp: new Date().toISOString()
                          });
                        }
                      }}
                    >
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
              isOpen={paywall.showPaywall}
              onClose={paywall.closePaywall}
              onSuccess={() => {
                // Mark as paid in localStorage and close modal
                paywall.markAsPaid(bootstrap.slug);
                
                // Initialize player after successful payment
                if (bootstrap.streamUrl) {
                  console.log('[DirectStream] 💳 Payment successful, initializing player');
                  initPlayer(bootstrap.streamUrl);
                }
              }}
              priceInCents={bootstrap.priceInCents || 0}
              paywallMessage={bootstrap.paywallMessage}
              allowSavePayment={bootstrap.allowSavePayment}
            />
          )}

          {/* Video Player Container - Enhanced with shadow */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              ref={containerRef}
              className="relative w-full aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden shadow-2xl border border-white/10"
              style={{ minHeight: '400px' }}
            >
              {/* Paywall Blocker Overlay */}
              {isPaywallBlocked && paywallChecked && (
                <div 
                  className="absolute inset-0 flex items-center justify-center z-30 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-sm"
                  data-testid="paywall-blocker"
                >
                  <div className="text-center text-white max-w-md mx-auto px-4">
                    {/* Lock icon */}
                    <div className="mb-6 relative">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-600/20 to-amber-900/20 rounded-full flex items-center justify-center shadow-2xl border border-amber-500/30">
                        <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 w-20 h-20 mx-auto bg-amber-500/10 rounded-full blur-xl" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">Premium Stream</h2>
                    <p className="text-gray-400 text-sm md:text-base mb-2">
                      {bootstrap.paywallMessage || 'This stream requires payment to watch.'}
                    </p>
                    <p className="text-xl font-bold text-amber-400 mb-6">
                      ${((bootstrap.priceInCents || 0) / 100).toFixed(2)}
                    </p>
                    <TouchButton
                      onClick={paywall.openPaywall}
                      variant="primary"
                      className="bg-amber-500 hover:bg-amber-600 shadow-2xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-shadow"
                      data-testid="btn-unlock-stream"
                    >
                      Unlock Stream
                    </TouchButton>
                  </div>
                </div>
              )}

              {status === 'offline' && !isEditing && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="text-center text-white max-w-md mx-auto px-4">
                    {/* Animated icon */}
                    <div className="mb-6 relative">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 w-20 h-20 mx-auto bg-blue-500/10 rounded-full blur-xl animate-pulse" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">Stream Offline</h2>
                    <p className="text-gray-400 text-sm md:text-base mb-6">No stream URL configured yet</p>
                    <TouchButton
                      onClick={() => setIsEditing(true)}
                      variant="primary"
                      className="shadow-2xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow"
                      data-testid="btn-set-stream"
                    >
                      Open Admin Panel
                    </TouchButton>
                  </div>
                </div>
              )}

              {status === 'error' && !isEditing && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="text-center text-white max-w-md mx-auto px-4">
                    {/* Animated error icon */}
                    <div className="mb-6 relative">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-900/50 to-red-950/50 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 w-20 h-20 mx-auto bg-red-500/10 rounded-full blur-xl animate-pulse" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">Unable to Load Stream</h2>
                    <p className="text-gray-400 text-sm md:text-base mb-6">Please check the stream URL and try again</p>
                    <TouchButton
                      onClick={() => setIsEditing(true)}
                      variant="primary"
                      className="shadow-2xl shadow-red-500/20 hover:shadow-red-500/40 transition-shadow"
                      data-testid="btn-update-stream"
                    >
                      Open Admin Panel
                    </TouchButton>
                  </div>
                </div>
              )}

              {status === 'loading' && bootstrap?.streamUrl && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-br from-black/80 via-gray-900/80 to-black/80 backdrop-blur-sm">
                  <div className="text-center text-white">
                    {/* Animated loading spinner */}
                    <div className="mb-6">
                      <div className="w-16 h-16 mx-auto border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2 tracking-tight">Loading stream...</h2>
                    <p className="text-gray-400 text-sm animate-pulse">Please wait</p>
                  </div>
                </div>
              )}

              {/* v2 Video Player or Stream Placeholder */}
              {status === 'playing' && (
                <VideoPlayer
                  ref={videoRef}
                  src="" // Empty - HLS.js manages source. Safari fallback sets src directly in initPlayer
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
                  data-testid="video-player"
                />
              )}
              
              {/* Stream Placeholder (when offline/error/not configured) */}
              {(status === 'offline' || status === 'error' || status === 'loading') && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900"
                  data-testid="stream-placeholder"
                >
                  <div className="text-center p-8 max-w-md">
                    <div className="mb-6">
                      {status === 'loading' && (
                        <div className="w-20 h-20 mx-auto rounded-full bg-gray-800/50 flex items-center justify-center">
                          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                      {status === 'offline' && !streamConfig && (
                        <div className="w-20 h-20 mx-auto rounded-full bg-blue-900/20 flex items-center justify-center">
                          <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {status === 'offline' && streamConfig && (
                        <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                      )}
                      {status === 'error' && (
                        <div className="w-20 h-20 mx-auto rounded-full bg-red-900/20 flex items-center justify-center">
                          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {status === 'loading' && 'Loading Stream...'}
                      {status === 'offline' && !streamConfig && 'No Stream Configured'}
                      {status === 'offline' && streamConfig && 'Stream Offline'}
                      {status === 'error' && 'Stream Error'}
                    </h3>
                    
                    <p className="text-gray-400 mb-6 text-sm">
                      {streamMessage || (status === 'loading' ? 'Please wait...' : 'Stream is currently unavailable')}
                    </p>
                    
                    {isAdmin && status !== 'loading' && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg"
                        data-testid="btn-configure-stream"
                      >
                        Configure Stream
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* v2 Video Controls (outside video container, below it) */}
              {status === 'playing' && (
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

              {/* v2 Panels work in both normal and fullscreen modes */}
              {/* Legacy fullscreen overlays deprecated - removed MobileControlBar, FullscreenChatOverlay, CollapsibleScoreboardOverlay */}
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
            {/* Collapsed: Right-edge tab - Enhanced with glow */}
            {chatPanel.isCollapsed && (
              <button
                type="button"
                data-testid="chat-collapsed-tab"
                className={cn(
                  'fixed right-0 top-1/2 -translate-y-1/2 z-30',
                  'w-12 py-4',
                  'bg-black/80 backdrop-blur-md',
                  'border-l-2 border-white/20',
                  'rounded-l-lg',
                  'shadow-2xl shadow-green-500/10',
                  'cursor-pointer pointer-events-auto',
                  'hover:bg-black/90 hover:w-14 hover:border-white/40 hover:shadow-green-500/30',
                  'transition-all duration-300',
                  'flex flex-col items-center gap-2',
                  'group'
                )}
                onClick={chatPanel.toggle}
                aria-label="Expand chat"
              >
                <div className="text-white/60 text-xs font-bold group-hover:text-white/90 transition-colors">←</div>
                <div className="text-2xl group-hover:scale-110 transition-transform">💬</div>
                {chat.messages.length > 0 && (
                  <Badge 
                    count={chat.messages.length}
                    max={9}
                    color="error"
                    data-testid="chat-collapsed-badge"
                  />
                )}
                {chat.isConnected && (
                  <div className="absolute -left-1 top-4 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </button>
            )}

            {/* Expanded Chat Panel - Enhanced with depth */}
            {!chatPanel.isCollapsed && (
              <div
                className={cn(
                  'fixed right-0 top-1/2 -translate-y-1/2 z-30',
                  'w-[360px] max-h-[80vh]',
                  'bg-black/90 backdrop-blur-md',
                  'border-l-2 border-white/20',
                  'rounded-l-lg shadow-2xl shadow-green-500/10',
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
                          <div 
                            className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm" 
                            role="alert"
                            ref={(el) => {
                              if (el) {
                                console.error('[DirectStream] 🔴 RED ERROR DISPLAYED (Chat):', {
                                  type: 'chat',
                                  message: chat.error,
                                  timestamp: new Date().toISOString()
                                });
                              }
                            }}
                          >
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
                            <TouchButton
                              onClick={() => setShowInlineRegistration(true)}
                              variant="primary"
                              data-testid="btn-open-viewer-auth"
                              className="w-full"
                            >
                              Register to Chat
                            </TouchButton>
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
                                
                                // Call handleViewerRegister with correct signature: (email, name)
                                await handleViewerRegister(email, displayName);
                                
                                // Close form on success
                                setShowInlineRegistration(false);
                              }}
                              className="space-y-3"
                              data-testid="form-viewer-register"
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
                                  data-testid="input-name"
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
                                  data-testid="input-email"
                                  defaultValue={globalAuth.viewerIdentity?.email || ''}
                                />
                              </div>
                              <TouchButton
                                type="submit"
                                disabled={viewer.isLoading || globalAuth.isAutoRegistering}
                                variant="primary"
                                className="w-full"
                                data-testid="btn-submit-viewer-register"
                              >
                                {viewer.isLoading || globalAuth.isAutoRegistering ? 'Registering...' : 'Register'}
                              </TouchButton>
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

        {/* Connection Debug Panel - shows in dev or with ?debug=true */}
        <ConnectionDebugPanel
          stream={streamDebug}
          api={apiHealth.health}
          chat={{
            isConnected: chat.isConnected,
            messages: chat.messages,
            error: chat.error || null,
            transport: 'SSE',
            gameId: effectiveGameId || undefined,
          }}
          viewer={{
            isUnlocked: viewer.isUnlocked,
            token: viewer.token,
            viewerId: viewer.viewerId,
            isLoading: viewer.isLoading,
            error: viewer.error,
          }}
          effectiveGameId={effectiveGameId}
          metrics={metrics}
          slug={bootstrap?.slug}
          onCheckEndpoint={apiHealth.checkEndpoint}
        />
        
        {/* Legacy ChatDebugPanel - keep for backward compatibility */}
        <ChatDebugPanel
          bootstrap={bootstrap}
          viewer={{
            isUnlocked: viewer.isUnlocked,
            token: viewer.token,
            viewerId: viewer.viewerId,
            isLoading: viewer.isLoading,
            error: viewer.error,
          }}
          chat={{
            isConnected: chat.isConnected,
            messages: chat.messages,
            error: chat.error || null,
          }}
          effectiveGameId={effectiveGameId}
        />
      </div>
    </div>
  );
}

