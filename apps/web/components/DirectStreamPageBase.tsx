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

import { useEffect, useRef, useState, useMemo, useCallback, type ReactNode } from 'react';
import { type MediaPlayerInstance } from '@vidstack/react';
import { X } from 'lucide-react';
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
// Legacy components (needed for Admin Panel)
import { AdminPanel } from '@/components/AdminPanel';
import { SocialProducerPanel } from '@/components/SocialProducerPanel';
import { ViewerAnalyticsPanel } from '@/components/ViewerAnalyticsPanel';
import { PaywallModal } from '@/components/PaywallModal';
// v2 Components
import { StreamPlayer } from '@/components/v2/video/StreamPlayer';
import { useFullscreen } from '@/hooks/v2/useFullscreen';
import { Chat } from '@/components/v2/chat';
import { Scoreboard } from '@/components/v2/scoreboard';
import { useScoreboardData } from '@/hooks/useScoreboardData';
import { ViewerAuthModal } from '@/components/v2/auth';
import { TouchButton, Badge } from '@/components/v2/primitives';
import { BottomSheet } from '@/components/v2/primitives/BottomSheet';
import { useResponsive } from '@/hooks/v2/useResponsive';
// Debug component
import { ChatDebugPanel } from '@/components/ChatDebugPanel';
// DVR components
import { BookmarkButton } from '@/components/dvr/BookmarkButton';
import { BookmarkMarkers } from '@/components/v2/video/BookmarkMarkers';
import { QuickBookmarkButton } from '@/components/v2/video/QuickBookmarkButton';
import { BookmarkPanel } from '@/components/v2/video/BookmarkPanel';
import { BookmarkToast, useBookmarkToasts } from '@/components/v2/video/BookmarkToast';
import { useBookmarkMarkers } from '@/hooks/v2/useBookmarkMarkers';
import { useViewerCount } from '@/hooks/useViewerCount';
import { PortraitStreamLayout, type PortraitTab } from '@/components/v2/layout/PortraitStreamLayout';

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
  allowViewerScoreEdit?: boolean;
  allowViewerNameEdit?: boolean;
  allowAnonymousChat?: boolean;
  allowAnonymousScoreEdit?: boolean;
  // Stream provider metadata (for Mux Player selection)
  streamProvider?: string | null;
  muxPlaybackId?: string | null;
  protectionLevel?: string | null;
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
  const playerRef = useRef<MediaPlayerInstance>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'offline' | 'error'>('loading');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [isChatOverlayVisible, setIsChatOverlayVisible] = useState(false);
  const [isScoreboardOverlayVisible, setIsScoreboardOverlayVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [adminJwt, setAdminJwt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showViewerAuthModal, setShowViewerAuthModal] = useState(false);
  const [showInlineRegistration, setShowInlineRegistration] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Bookmark panel uses useCollapsiblePanel (bookmarkPanel) instead of local state
  const [guestDisplayName, setGuestDisplayName] = useState<string | null>(null);
  const [isEditingGuestName, setIsEditingGuestName] = useState(false);

  // Fullscreen hook (v2)
  const { isFullscreen } = useFullscreen(containerRef.current);

  // v2 Responsive hook (replaces manual detection)
  const { isMobile, isTablet, isDesktop, isTouch, breakpoint, chatPosition, scoreboardPosition, orientation } = useResponsive();
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [portraitActiveTab, setPortraitActiveTab] = useState<PortraitTab>('chat');
  const isPortrait = isMobile && orientation === 'portrait';

  // Paywall hook - manages paywall state based on bootstrap
  const paywall = usePaywall({
    slug: bootstrap?.slug || '',
    enabled: false, // We use bootstrap data directly, not API fetch
    demoMode: false,
  });

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

  const bookmarkPanel = useCollapsiblePanel({
    edge: 'right',
    defaultCollapsed: true,
    storageKey: `bookmark-collapsed-${stableKey}`,
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
      .then((data: Bootstrap | null) => {
        if (!data) {
          console.log('[DirectStream] No bootstrap data returned');
          return;
        }
        
        console.log('[DirectStream] ✅ Bootstrap loaded:', {
          slug: data.slug,
          streamUrl: data.streamUrl,
          title: data.title,
          paywallEnabled: data.paywallEnabled,
          chatEnabled: data.chatEnabled,
          scoreboardEnabled: data.scoreboardEnabled
        });
        
        setBootstrap(data);
        config.onBootstrapLoaded?.(data);
        
        // Check paywall status before initializing player
        if (data.paywallEnabled) {
          // Check if user has already paid (localStorage)
          const storageKey = `paywall_${data.slug}`;
          const stored = localStorage.getItem(storageKey);
          const localHasPaid = stored ? JSON.parse(stored).hasPaid : false;
          
          if (localHasPaid) {
            console.log('[DirectStream] 💳 localStorage says paid, verifying with server...');
            
            // CRITICAL SECURITY: Verify with server before granting access
            // Get viewer identity from global auth or local viewer state
            const viewerId = globalAuth.viewerIdentityId || viewer.viewerId;
            const email = globalAuth.viewerEmail;
            
            // Build query params
            const params = new URLSearchParams();
            if (viewerId) params.append('viewerId', viewerId);
            else if (email) params.append('email', email);
            
            // Verify access with server
            fetch(`${API_URL}/api/direct/${data.slug}/verify-access?${params.toString()}`)
              .then(res => res.json())
              .then(verifyResult => {
                if (verifyResult.hasAccess) {
                  console.log('[DirectStream] ✅ Server verified access, initializing player');
                  console.log('[DirectStream] 📝 Reason:', verifyResult.reason);
                  if (verifyResult.entitlement) {
                    console.log('[DirectStream] 🎫 Entitlement expires:', verifyResult.entitlement.expiresAt);
                  }
                  setPaywallChecked(true);
                  if (data.streamUrl) {
                    setStreamUrl(data.streamUrl);
                  } else {
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
          if (data.streamUrl) {
            console.log('[DirectStream] ▶️ Initializing player with streamUrl');
            setStreamUrl(data.streamUrl);
          } else {
            console.warn('[DirectStream] ⚠️ No streamUrl in bootstrap data');
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

  // Anonymous chat auto-connect: when allowAnonymousChat is enabled, auto-issue a viewer token
  useEffect(() => {
    if (!bootstrap || viewer.isUnlocked || !bootstrap.allowAnonymousChat) return;

    const connectAnonymous = async () => {
      try {
        // Get or create a persistent session ID
        const storageKey = 'fieldview_anon_session';
        let sessionId = localStorage.getItem(storageKey);
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem(storageKey, sessionId);
        }

        // Check for a saved guest name for this stream
        const savedName = localStorage.getItem(`fieldview_guest_name_${bootstrap.slug}`);

        const response = await fetch(
          `${API_URL}/api/public/direct/${encodeURIComponent(bootstrap.slug)}/viewer/anonymous-token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              displayName: savedName || undefined,
            }),
          }
        );

        if (!response.ok) return;

        const data = await response.json();
        viewer.setExternalIdentity({
          viewerToken: data.viewerToken,
          viewerId: data.viewer.id,
          displayName: data.viewer.displayName,
          gameId: data.gameId,
          email: `anon-${sessionId}@guest.fieldview.live`,
        });
        setGuestDisplayName(data.viewer.displayName);
      } catch (err) {
        console.error('[DirectStreamPageBase] Anonymous auto-connect failed:', err);
      }
    };

    void connectAnonymous();
  }, [bootstrap, viewer.isUnlocked]);

  // Check if current viewer is anonymous (for guest name change UI)
  const isAnonymousViewer = useMemo(() => {
    try {
      const saved = localStorage.getItem('fieldview_viewer_identity');
      if (saved) {
        const identity = JSON.parse(saved);
        return identity.email?.endsWith('@guest.fieldview.live') ?? false;
      }
    } catch { /* ignore */ }
    return false;
  }, [viewer.isUnlocked]);

  // Handler to change anonymous guest name
  const handleChangeGuestName = useCallback(async (newName: string) => {
    if (!bootstrap || !newName.trim()) return;
    const trimmed = newName.trim();
    localStorage.setItem(`fieldview_guest_name_${bootstrap.slug}`, trimmed);
    setGuestDisplayName(trimmed);
    setIsEditingGuestName(false);

    // Re-fetch anonymous token with new name
    const sessionId = localStorage.getItem('fieldview_anon_session');
    if (!sessionId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/public/direct/${encodeURIComponent(bootstrap.slug)}/viewer/anonymous-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, displayName: trimmed }),
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      viewer.setExternalIdentity({
        viewerToken: data.viewerToken,
        viewerId: data.viewer.id,
        displayName: data.viewer.displayName,
        gameId: data.gameId,
        email: `anon-${sessionId}@guest.fieldview.live`,
      });
    } catch (err) {
      console.error('[DirectStreamPageBase] Guest name change failed:', err);
    }
  }, [bootstrap, viewer]);

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
    adminToken: adminJwt,
    allowAnonymousEdit: bootstrap?.allowAnonymousScoreEdit && bootstrap?.allowViewerScoreEdit,
  });

  // Live viewer count
  const viewerCount = useViewerCount({
    slug: bootstrap?.slug || null,
    enabled: !!bootstrap,
  });

  // Bookmark toast notifications (real-time SSE announcements)
  const bookmarkToasts = useBookmarkToasts();

  // Bookmark markers for the timeline (with SSE real-time + toast callback)
  const bookmarkMarkers = useBookmarkMarkers({
    directStreamId: bootstrap?.slug,
    viewerId: viewer.viewerId || undefined,
    enabled: !!streamUrl && !isPaywallBlocked,
    onBookmarkReceived: useCallback((bookmark: { id: string; viewerIdentityId?: string | null; timestampSeconds: number; label: string }) => {
      // Don't show toast for own bookmarks (they already see the optimistic marker)
      if (bookmark.viewerIdentityId === viewer.viewerId) return;
      const secs = bookmark.timestampSeconds;
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = Math.floor(secs % 60);
      const time = h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`;
      bookmarkToasts.addToast({
        id: bookmark.id,
        label: bookmark.label,
        timestampSeconds: bookmark.timestampSeconds,
        time,
      });
    }, [viewer.viewerId, bookmarkToasts.addToast]),
  });

  // Notify status changes
  useEffect(() => {
    config.onStreamStatusChange?.(status);
  }, [status, config]);

  // Keyboard shortcuts: C for chat, S for scoreboard, Escape to close panels
  // Note: F (fullscreen), Space (play/pause), M (mute), arrows (seek) are handled by Vidstack
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
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

      // B toggles bookmark panel (portrait: switches tab; landscape/desktop: toggles collapsible panel)
      if ((e.key === 'b' || e.key === 'B') && viewer.isUnlocked) {
        e.preventDefault();
        if (isPortrait) {
          setPortraitActiveTab(prev => prev === 'bookmarks' ? 'chat' : 'bookmarks');
        } else {
          bookmarkPanel.toggle();
        }
      }

      // Escape closes panels in priority order
      if (e.key === 'Escape') {
        if (!bookmarkPanel.isCollapsed) {
          e.preventDefault();
          bookmarkPanel.collapse();
        } else if (isMobileChatOpen) {
          e.preventDefault();
          setIsMobileChatOpen(false);
        } else if (isChatOpen) {
          e.preventDefault();
          setIsChatOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isChatOverlayVisible, isScoreboardOverlayVisible, isChatOpen, isMobileChatOpen, bookmarkPanel.isCollapsed, bookmarkPanel.toggle, bookmarkPanel.collapse, viewer.isUnlocked, bootstrap?.chatEnabled, bootstrap?.scoreboardEnabled, scoreboardPanel.toggle, chatPanel.toggle, isPortrait, setPortraitActiveTab]);

  // ==========================================
  // Portrait Mode Layout (mobile only)
  // ==========================================
  if (isPortrait) {
    return (
      <>
        <PortraitStreamLayout
          // Video section: player + all overlays + bookmark controls
          videoSection={
            <div
              ref={containerRef}
              className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black"
            >
              {/* Paywall Blocker Overlay */}
              {isPaywallBlocked && paywallChecked && (
                <div className="absolute inset-0 flex items-center justify-center z-30 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-sm">
                  <div className="text-center text-white max-w-xs mx-auto px-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-600/20 rounded-full flex items-center justify-center border border-amber-500/30">
                      <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Premium Stream</h2>
                    <p className="text-gray-400 text-xs mb-2">{bootstrap?.paywallMessage || 'Payment required'}</p>
                    <p className="text-lg font-bold text-amber-400 mb-3">${((bootstrap?.priceInCents || 0) / 100).toFixed(2)}</p>
                    <TouchButton onClick={paywall.openPaywall} variant="primary" size="sm" className="bg-amber-500 hover:bg-amber-600">
                      Unlock Stream
                    </TouchButton>
                  </div>
                </div>
              )}

              {/* Status overlays */}
              {status === 'offline' && !isEditing && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="text-center text-white px-4">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gray-700/50 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold mb-1">Stream Offline</h2>
                    <p className="text-gray-400 text-xs">No stream configured</p>
                  </div>
                </div>
              )}

              {status === 'loading' && bootstrap?.streamUrl && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80 backdrop-blur-sm">
                  <div className="text-center text-white">
                    <div className="w-12 h-12 mx-auto mb-3 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-sm font-medium">Loading stream...</p>
                  </div>
                </div>
              )}

              {/* StreamPlayer */}
              {streamUrl && !isPaywallBlocked && (
                <StreamPlayer
                  src={streamUrl}
                  streamProvider={bootstrap?.streamProvider}
                  muxPlaybackId={bootstrap?.muxPlaybackId}
                  playerRef={playerRef}
                  onStatusChange={setStatus}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  className="absolute inset-0 w-full h-full"
                  metadata={{
                    video_title: bootstrap?.title ?? config.title,
                    player_name: 'FieldView.Live',
                  }}
                >
                  {bookmarkMarkers.bookmarks.length > 0 && duration > 0 && (
                    <BookmarkMarkers
                      bookmarks={bookmarkMarkers.bookmarks}
                      duration={duration}
                      currentViewerId={viewer.viewerId || undefined}
                      onBookmarkClick={(bookmark) => {
                        if (playerRef.current) {
                          playerRef.current.currentTime = bookmark.timestampSeconds;
                        }
                      }}
                    />
                  )}
                </StreamPlayer>
              )}

              {/* Bookmark controls overlay */}
              {streamUrl && viewer.isUnlocked && viewer.viewerId && status !== 'offline' && status !== 'error' && (
                <div className="absolute z-20 flex items-center gap-1.5 bottom-14 right-2 [&_button]:min-h-[44px] [&_button]:min-w-[44px]">
                  <QuickBookmarkButton
                    directStreamId={bootstrap?.slug || ''}
                    viewerIdentityId={viewer.viewerId}
                    getCurrentTime={() => playerRef.current?.currentTime ?? 0}
                    onBookmarkCreated={bookmarkMarkers.addBookmarkOptimistic}
                  />
                  <BookmarkButton
                    directStreamId={bootstrap?.slug || ''}
                    viewerIdentityId={viewer.viewerId}
                    getCurrentTime={() => playerRef.current?.currentTime ?? 0}
                    onBookmarkCreated={bookmarkMarkers.addBookmarkOptimistic}
                    className=""
                  />
                  <button
                    type="button"
                    onClick={() => setPortraitActiveTab('bookmarks')}
                    className={cn(
                      'px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors shadow-lg',
                      portraitActiveTab === 'bookmarks'
                        ? 'bg-amber-500 shadow-amber-500/30'
                        : 'bg-gray-700/80 hover:bg-gray-600 shadow-black/30',
                    )}
                    aria-label="Show bookmarks"
                    data-testid="btn-portrait-bookmark-tab"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Real-time bookmark toast notifications (portrait) */}
              {bookmarkToasts.toasts.length > 0 && (
                <BookmarkToast
                  toasts={bookmarkToasts.toasts}
                  onJumpTo={(timestampSeconds) => {
                    if (playerRef.current) {
                      playerRef.current.currentTime = timestampSeconds;
                    }
                  }}
                  onDismiss={bookmarkToasts.dismissToast}
                />
              )}
            </div>
          }

          // Scoreboard
          homeTeam={scoreboardData.homeTeam}
          awayTeam={scoreboardData.awayTeam}
          period={scoreboardData.period}
          time={scoreboardData.time}
          scoreboardEnabled={bootstrap?.scoreboardEnabled ?? false}
          scoreboardEditable={viewer.isUnlocked || (bootstrap?.allowAnonymousScoreEdit && bootstrap?.allowViewerScoreEdit) || false}
          onScoreUpdate={scoreboardData.updateScore}

          // Chat
          chatContent={
            viewer.isUnlocked ? (
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
                data-testid="chat-portrait"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <p className="text-sm text-[var(--fv-color-text-muted)] mb-3">Register to join the chat</p>
                <TouchButton
                  onClick={() => setShowViewerAuthModal(true)}
                  variant="primary"
                  size="sm"
                  data-testid="btn-portrait-register"
                >
                  Join Chat
                </TouchButton>
              </div>
            )
          }
          chatMessageCount={chatV2.messages.length}
          chatEnabled={bootstrap?.chatEnabled ?? false}

          // Bookmarks
          bookmarkContent={
            viewer.isUnlocked && viewer.viewerId && bootstrap?.slug ? (
              <BookmarkPanel
                isOpen={true}
                onClose={() => setPortraitActiveTab('chat')}
                directStreamId={bootstrap.slug}
                viewerId={viewer.viewerId}
                mode="inline"
                onSeek={(timeSeconds) => {
                  if (playerRef.current) {
                    playerRef.current.currentTime = timeSeconds;
                  }
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-sm text-[var(--fv-color-text-muted)]">Register to use bookmarks</p>
              </div>
            )
          }
          bookmarkCount={bookmarkMarkers.bookmarks.length}
          bookmarksAvailable={!!viewer.isUnlocked && !!viewer.viewerId}

          // Tab control
          activeTab={portraitActiveTab}
          onTabChange={setPortraitActiveTab}
        />

        {/* Modals that must render outside the layout */}
        {bootstrap?.paywallEnabled && (
          <PaywallModal
            slug={bootstrap.slug}
            isOpen={paywall.showPaywall}
            onClose={paywall.closePaywall}
            onSuccess={() => {
              paywall.markAsPaid(bootstrap.slug);
              if (bootstrap.streamUrl) setStreamUrl(bootstrap.streamUrl);
            }}
            priceInCents={bootstrap.priceInCents || 0}
            paywallMessage={bootstrap.paywallMessage}
            allowSavePayment={bootstrap.allowSavePayment}
          />
        )}

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
      </>
    );
  }

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
                <div className="flex items-center gap-3">
                  {config.subtitle && <p className="text-gray-400 text-sm">{config.subtitle}</p>}
                  {viewerCount.count > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400" data-testid="viewer-count">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      {viewerCount.count} watching
                    </span>
                  )}
                </div>
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
                    onClick={() => setIsEditing(false)}
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
                    allowViewerScoreEdit: bootstrap?.allowViewerScoreEdit,
                    allowViewerNameEdit: bootstrap?.allowViewerNameEdit,
                    allowAnonymousChat: bootstrap?.allowAnonymousChat,
                    allowAnonymousScoreEdit: bootstrap?.allowAnonymousScoreEdit,
                  }}
                  onAuthSuccess={(jwt, viewerInfo) => {
                    setAdminJwt(jwt);
                    setIsAdmin(true);
                    // Auto-login admin as viewer for chat + scoreboard
                    if (viewerInfo) {
                      viewer.setExternalIdentity(viewerInfo);
                    }
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

          {/* Scoreboard Overlay (non-fullscreen) */}
          {!isFullscreen && bootstrap?.scoreboardEnabled && (
            <>
              {/* Mobile: Floating compact scoreboard at top */}
              {scoreboardPosition === 'floating' ? (
                <div
                  className={cn(
                    'fixed top-2 left-2 right-2 z-30',
                    'bg-black/85 backdrop-blur-md',
                    'border border-white/20',
                    'rounded-lg shadow-2xl',
                    'px-3 py-2'
                  )}
                  data-testid="scoreboard-panel"
                  role="region"
                  aria-label="Scoreboard"
                >
                  <Scoreboard
                    homeTeam={scoreboardData.homeTeam}
                    awayTeam={scoreboardData.awayTeam}
                    period={scoreboardData.period}
                    time={scoreboardData.time}
                    mode="minimal"
                    editable={viewer.isUnlocked || (bootstrap?.allowAnonymousScoreEdit && bootstrap?.allowViewerScoreEdit) || false}
                    onScoreUpdate={scoreboardData.updateScore}
                    data-testid="scoreboard-v2"
                  />
                </div>
              ) : (
                <>
                  {/* Tablet/Desktop: Collapsible left-edge sidebar */}
                  {/* Collapsed: Left-edge tab */}
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
                      <div className="text-white/60 text-xs font-bold group-hover:text-white/90 transition-colors">&rarr;</div>
                      <div className="text-2xl group-hover:scale-110 transition-transform">📊</div>
                      <div className="absolute -right-1 top-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  </button>
                  )}

                  {/* Expanded Scoreboard Panel */}
                  {!scoreboardPanel.isCollapsed && (
                  <div
                    className={cn(
                      'fixed left-0 top-1/2 -translate-y-1/2 z-30',
                      isTablet ? 'w-[min(320px,40vw)]' : 'w-[320px]',
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
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Scoreboard</h3>
                        <button
                          type="button"
                          className="text-white/70 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
                          onClick={scoreboardPanel.toggle}
                          aria-label="Collapse scoreboard"
                          data-testid="btn-collapse-scoreboard"
                        >
                          <div className="text-lg">&larr;</div>
                        </button>
                      </div>

                      <Scoreboard
                        homeTeam={scoreboardData.homeTeam}
                        awayTeam={scoreboardData.awayTeam}
                        period={scoreboardData.period}
                        time={scoreboardData.time}
                        mode="sidebar"
                        editable={viewer.isUnlocked || (bootstrap?.allowAnonymousScoreEdit && bootstrap?.allowViewerScoreEdit) || false}
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

                // Set stream URL after successful payment - Vidstack will auto-initialize
                if (bootstrap.streamUrl) {
                  console.log('[DirectStream] Payment successful, setting stream URL');
                  setStreamUrl(bootstrap.streamUrl);
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
              style={{ minHeight: isMobile ? '200px' : isTablet ? '300px' : '400px' }}
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

              {/* Stream Player - routes to MuxPlayer or VidstackPlayer based on provider */}
              {streamUrl && !isPaywallBlocked && (
                <StreamPlayer
                  src={streamUrl}
                  streamProvider={bootstrap?.streamProvider}
                  muxPlaybackId={bootstrap?.muxPlaybackId}
                  playerRef={playerRef}
                  onStatusChange={setStatus}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  className="absolute inset-0 w-full h-full"
                  metadata={{
                    video_title: bootstrap?.title ?? config.title,
                    player_name: 'FieldView.Live',
                  }}
                >
                  {/* Bookmark markers overlaid on the timeline */}
                  {bookmarkMarkers.bookmarks.length > 0 && duration > 0 && (
                    <BookmarkMarkers
                      bookmarks={bookmarkMarkers.bookmarks}
                      duration={duration}
                      currentViewerId={viewer.viewerId || undefined}
                      onBookmarkClick={(bookmark) => {
                        if (playerRef.current) {
                          playerRef.current.currentTime = bookmark.timestampSeconds;
                        }
                      }}
                    />
                  )}
                </StreamPlayer>
              )}

              {/* DVR Bookmark Controls - positioned over the player */}
              {streamUrl && viewer.isUnlocked && viewer.viewerId && status !== 'offline' && status !== 'error' && (
                <div className={cn(
                  'absolute z-20 flex items-center gap-2',
                  isMobile ? 'bottom-20 right-2' : 'bottom-16 right-2',
                  isMobile && '[&_button]:min-h-[44px] [&_button]:min-w-[44px]'
                )}>
                  {/* Quick one-click bookmark */}
                  <QuickBookmarkButton
                    directStreamId={bootstrap?.slug || ''}
                    viewerIdentityId={viewer.viewerId}
                    getCurrentTime={() => playerRef.current?.currentTime ?? 0}
                    onBookmarkCreated={bookmarkMarkers.addBookmarkOptimistic}
                  />
                  {/* Full bookmark with label, notes, sharing, time window */}
                  <BookmarkButton
                    directStreamId={bootstrap?.slug || ''}
                    viewerIdentityId={viewer.viewerId}
                    getCurrentTime={() => playerRef.current?.currentTime ?? 0}
                    onBookmarkCreated={bookmarkMarkers.addBookmarkOptimistic}
                    className=""
                  />
                  {/* Toggle bookmark panel (collapsible sidebar) */}
                  <button
                    type="button"
                    onClick={bookmarkPanel.toggle}
                    className={`relative px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg text-white text-sm font-medium transition-colors shadow-lg flex items-center justify-center
                      ${!bookmarkPanel.isCollapsed
                        ? 'bg-amber-500 shadow-amber-500/30'
                        : 'bg-gray-700/80 hover:bg-gray-600 shadow-black/30'
                      }`}
                    aria-label="Toggle bookmarks panel"
                    data-testid="btn-toggle-bookmark-panel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    {bookmarkMarkers.bookmarks.length > 0 && bookmarkPanel.isCollapsed && (
                      <span className="absolute -top-1.5 -right-1.5">
                        <Badge count={bookmarkMarkers.bookmarks.length} max={9} color="warning" />
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Real-time bookmark toast notifications */}
              {bookmarkToasts.toasts.length > 0 && (
                <BookmarkToast
                  toasts={bookmarkToasts.toasts}
                  onJumpTo={(timestampSeconds) => {
                    if (playerRef.current) {
                      playerRef.current.currentTime = timestampSeconds;
                    }
                  }}
                  onDismiss={bookmarkToasts.dismissToast}
                />
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
                  {viewer.isUnlocked && (
                    <>, <kbd className="px-2 py-1 bg-secondary rounded text-secondary-foreground">B</kbd> for bookmarks</>
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

        {/* Bookmark Panel - Collapsible right-edge sidebar (non-portrait, non-mobile) */}
        {!isPortrait && !isMobile && viewer.isUnlocked && viewer.viewerId && bootstrap?.slug && (
          <>
            {/* Collapsed: Right-edge tab (positioned above chat) */}
            {bookmarkPanel.isCollapsed && (
              <button
                type="button"
                data-testid="bookmark-collapsed-tab"
                className={cn(
                  'fixed right-0 top-[30%] -translate-y-1/2 z-30',
                  'w-12 py-4',
                  'bg-black/80 backdrop-blur-md',
                  'border-l-2 border-white/20',
                  'rounded-l-lg',
                  'shadow-2xl shadow-amber-500/10',
                  'cursor-pointer pointer-events-auto',
                  'hover:bg-black/90 hover:w-14 hover:border-white/40 hover:shadow-amber-500/30',
                  'transition-all duration-300',
                  'flex flex-col items-center gap-2',
                  'group'
                )}
                onClick={bookmarkPanel.toggle}
                aria-label="Expand bookmarks"
              >
                <div className="text-white/60 text-xs font-bold group-hover:text-white/90 transition-colors">&larr;</div>
                <svg className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {bookmarkMarkers.bookmarks.length > 0 && (
                  <Badge count={bookmarkMarkers.bookmarks.length} max={9} color="warning" />
                )}
              </button>
            )}

            {/* Expanded: Full sidebar panel */}
            {!bookmarkPanel.isCollapsed && (
              <div
                className={cn(
                  'fixed right-0 top-[30%] -translate-y-1/2 z-30',
                  isTablet ? 'w-[min(360px,45vw)]' : 'w-[360px]',
                  'max-h-[60vh]',
                  'bg-black/95 backdrop-blur-md',
                  'border-l-2 border-white/20',
                  'rounded-l-lg shadow-2xl shadow-amber-500/10',
                  'flex flex-col',
                  'transition-transform duration-300 ease-in-out'
                )}
                data-testid="bookmark-panel"
                role="dialog"
                aria-modal="false"
                aria-label="Bookmarks panel"
              >
                {/* Header with collapse button */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between relative">
                  <button
                    onClick={bookmarkPanel.toggle}
                    className="absolute -left-10 top-2 w-8 h-8 bg-black/95 backdrop-blur-sm border border-white/10 rounded-l-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-black transition-colors"
                    data-testid="btn-collapse-bookmark-panel"
                    aria-label="Collapse bookmarks"
                  >
                    <span className="text-xs font-bold">&rarr;</span>
                  </button>
                  <h3 className="text-lg font-bold text-white">Bookmarks</h3>
                  {bookmarkMarkers.bookmarks.length > 0 && (
                    <Badge count={bookmarkMarkers.bookmarks.length} max={9} color="warning" />
                  )}
                </div>
                <BookmarkPanel
                  isOpen={true}
                  onClose={bookmarkPanel.collapse}
                  directStreamId={bootstrap.slug}
                  viewerId={viewer.viewerId}
                  onSeek={(timeSeconds) => {
                    if (playerRef.current) {
                      playerRef.current.currentTime = timeSeconds;
                    }
                  }}
                  mode="inline"
                />
              </div>
            )}
          </>
        )}

        {/* Bookmark Panel - Mobile bottom sheet (portrait and landscape mobile) */}
        {(isPortrait || isMobile) && viewer.isUnlocked && viewer.viewerId && bootstrap?.slug && (
          <BookmarkPanel
            isOpen={!bookmarkPanel.isCollapsed}
            onClose={bookmarkPanel.collapse}
            directStreamId={bootstrap.slug}
            viewerId={viewer.viewerId}
            isMobile={true}
            onSeek={(timeSeconds) => {
              if (playerRef.current) {
                playerRef.current.currentTime = timeSeconds;
              }
            }}
          />
        )}

        {/* Chat Panel - Responsive: BottomSheet on mobile, sidebar on tablet/desktop */}
        {!isFullscreen && bootstrap?.chatEnabled && (
          <>
            {chatPosition === 'bottom-sheet' ? (
              <>
                {/* Mobile: Floating chat toggle button */}
                <button
                  type="button"
                  data-testid="btn-mobile-chat-toggle"
                  className={cn(
                    'fixed bottom-4 right-4 z-40',
                    'w-14 h-14 rounded-full',
                    'bg-green-600 shadow-lg shadow-green-500/30',
                    'flex items-center justify-center',
                    'active:scale-95 transition-transform'
                  )}
                  onClick={() => setIsMobileChatOpen(prev => !prev)}
                  aria-label={isMobileChatOpen ? 'Close chat' : 'Open chat'}
                >
                  <span className="text-2xl">{isMobileChatOpen ? '✕' : '💬'}</span>
                  {!isMobileChatOpen && chat.messages.length > 0 && (
                    <span className="absolute -top-1 -right-1">
                      <Badge count={chat.messages.length} max={9} color="error" />
                    </span>
                  )}
                  {chat.isConnected && !isMobileChatOpen && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-green-600" />
                  )}
                </button>

                {/* Mobile: Chat BottomSheet */}
                <BottomSheet
                  isOpen={isMobileChatOpen}
                  onClose={() => setIsMobileChatOpen(false)}
                  snapPoints={[0.5, 0.85]}
                  initialSnap={0}
                  enableDrag
                  aria-labelledby="mobile-chat-title"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3 -mt-2">
                    <h2 id="mobile-chat-title" className="text-white font-bold text-base">Live Chat</h2>
                    {chat.isConnected ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Connecting...</span>
                    )}
                  </div>

                  {/* Guest name bar (compact for mobile) */}
                  {viewer.isUnlocked && isAnonymousViewer && (
                    <div className="px-2 py-1.5 mb-2 rounded bg-amber-900/20 flex items-center justify-between text-xs">
                      {isEditingGuestName ? (
                        <form
                          className="flex items-center gap-2 w-full"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.elements.namedItem('guestName') as HTMLInputElement;
                            if (input.value.trim()) handleChangeGuestName(input.value);
                          }}
                        >
                          <input name="guestName" type="text" defaultValue={guestDisplayName || ''} maxLength={50} autoFocus className="flex-1 bg-black/40 border border-amber-600/50 rounded px-2 py-1 min-h-[44px] text-white text-sm" placeholder="Enter your name" />
                          <button type="submit" className="text-amber-400 hover:text-amber-300 font-medium">Save</button>
                          <button type="button" onClick={() => setIsEditingGuestName(false)} className="text-gray-400 hover:text-gray-300">Cancel</button>
                        </form>
                      ) : (
                        <>
                          <span className="text-amber-200/80">Chatting as <strong className="text-amber-300">{guestDisplayName || 'Guest'}</strong></span>
                          <button onClick={() => setIsEditingGuestName(true)} className="text-amber-400 hover:text-amber-300 underline">Change name</button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Chat content */}
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden -mx-6 pb-[env(safe-area-inset-bottom,0px)]">
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
                        <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="list-chat-messages">
                          {chat.error && (
                            <div className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm" role="alert">{chat.error}</div>
                          )}
                          {chat.messages.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 text-sm">No messages yet. Be the first to chat!</p>
                          ) : (
                            chat.messages.map((msg) => (
                              <div key={msg.id} className="p-3 bg-muted/50 rounded-lg" data-testid={`chat-msg-${msg.id}`}>
                                <div className="text-xs font-semibold text-muted-foreground mb-1">{msg.displayName}</div>
                                <div className="text-sm leading-relaxed break-words text-white">{msg.message}</div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="border-t border-outline p-4 bg-background/50">
                          {!showInlineRegistration ? (
                            <div className="space-y-3 text-center">
                              <p className="text-sm text-muted-foreground">Register your email to send messages</p>
                              <TouchButton onClick={() => setShowInlineRegistration(true)} variant="primary" data-testid="btn-open-viewer-auth" className="w-full">Register to Chat</TouchButton>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-white">Join the Chat</h3>
                                <button onClick={() => setShowInlineRegistration(false)} className="text-muted-foreground hover:text-white transition-colors" data-testid="btn-cancel-inline-registration" aria-label="Cancel registration"><X className="w-4 h-4" /></button>
                              </div>
                              <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const dn = fd.get('displayName') as string; const em = fd.get('email') as string; if (!dn || !em) return; await handleViewerRegister(em, dn); setShowInlineRegistration(false); }} className="space-y-3" data-testid="form-viewer-register">
                                <Input name="displayName" type="text" placeholder="Your name" required className="w-full bg-background/80 border-outline text-white placeholder:text-white/50" data-testid="input-name" defaultValue={globalAuth.viewerFirstName && globalAuth.viewerLastName ? `${globalAuth.viewerFirstName} ${globalAuth.viewerLastName}` : globalAuth.viewerFirstName || ''} />
                                <Input name="email" type="email" placeholder="you@example.com" required className="w-full bg-background/80 border-outline text-white placeholder:text-white/50" data-testid="input-email" defaultValue={globalAuth.viewerEmail || ''} />
                                <TouchButton type="submit" disabled={viewer.isLoading || globalAuth.isLoading} variant="primary" className="w-full" data-testid="btn-submit-viewer-register">{viewer.isLoading || globalAuth.isLoading ? 'Registering...' : 'Register'}</TouchButton>
                                {viewer.error && <p className="text-xs text-destructive text-center" role="alert">{viewer.error}</p>}
                              </form>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </BottomSheet>
              </>
            ) : (
              <>
                {/* Tablet/Desktop: Collapsible right-edge sidebar */}
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
                    <div className="text-white/60 text-xs font-bold group-hover:text-white/90 transition-colors">&larr;</div>
                    <div className="text-2xl group-hover:scale-110 transition-transform">💬</div>
                    {chat.messages.length > 0 && (
                      <Badge count={chat.messages.length} max={9} color="error" data-testid="chat-collapsed-badge" />
                    )}
                    {chat.isConnected && (
                      <div className="absolute -left-1 top-4 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </button>
                )}

                {!chatPanel.isCollapsed && (
                  <div
                    className={cn(
                      'fixed right-0 top-1/2 -translate-y-1/2 z-30',
                      isTablet ? 'w-[min(360px,45vw)]' : 'w-[360px]',
                      'max-h-[80vh]',
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
                      <button
                        onClick={chatPanel.toggle}
                        className="absolute -left-10 top-2 w-8 h-8 bg-background/95 backdrop-blur-sm border border-outline rounded-l-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-background transition-colors"
                        data-testid="btn-collapse-chat"
                        aria-label="Collapse chat"
                      >
                        <span className="text-xs font-bold">&rarr;</span>
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

                    {/* Guest name bar for anonymous users */}
                    {viewer.isUnlocked && isAnonymousViewer && (
                      <div className="px-4 py-2 border-b border-outline bg-amber-900/20 flex items-center justify-between text-xs">
                        {isEditingGuestName ? (
                          <form
                            className="flex items-center gap-2 w-full"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const input = e.currentTarget.elements.namedItem('guestName') as HTMLInputElement;
                              if (input.value.trim()) handleChangeGuestName(input.value);
                            }}
                          >
                            <input name="guestName" type="text" defaultValue={guestDisplayName || ''} maxLength={50} autoFocus className="flex-1 bg-black/40 border border-amber-600/50 rounded px-2 py-1 min-h-[44px] text-white text-sm" placeholder="Enter your name" />
                            <button type="submit" className="text-amber-400 hover:text-amber-300 font-medium">Save</button>
                            <button type="button" onClick={() => setIsEditingGuestName(false)} className="text-gray-400 hover:text-gray-300">Cancel</button>
                          </form>
                        ) : (
                          <>
                            <span className="text-amber-200/80">
                              Chatting as <strong className="text-amber-300">{guestDisplayName || 'Guest'}</strong>
                            </span>
                            <button onClick={() => setIsEditingGuestName(true)} className="text-amber-400 hover:text-amber-300 underline">Change name</button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
                          <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="list-chat-messages">
                            {chat.error && (
                              <div className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm" role="alert">{chat.error}</div>
                            )}
                            {chat.messages.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8 text-sm">No messages yet. Be the first to chat!</p>
                            ) : (
                              chat.messages.map((msg) => (
                                <div key={msg.id} className="p-3 bg-muted/50 rounded-lg" data-testid={`chat-msg-${msg.id}`}>
                                  <div className="text-xs font-semibold text-muted-foreground mb-1">{msg.displayName}</div>
                                  <div className="text-sm leading-relaxed break-words text-white">{msg.message}</div>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="border-t border-outline p-4 bg-background/50">
                            {!showInlineRegistration ? (
                              <div className="space-y-3 text-center">
                                <p className="text-sm text-muted-foreground">Register your email to send messages</p>
                                <TouchButton onClick={() => setShowInlineRegistration(true)} variant="primary" data-testid="btn-open-viewer-auth" className="w-full">Register to Chat</TouchButton>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-sm font-semibold text-white">Join the Chat</h3>
                                  <button onClick={() => setShowInlineRegistration(false)} className="text-muted-foreground hover:text-white transition-colors" data-testid="btn-cancel-inline-registration" aria-label="Cancel registration"><X className="w-4 h-4" /></button>
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">Register your email to start chatting</p>
                                <form
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const displayName = formData.get('displayName') as string;
                                    const email = formData.get('email') as string;
                                    if (!displayName || !email) return;
                                    await handleViewerRegister(email, displayName);
                                    setShowInlineRegistration(false);
                                  }}
                                  className="space-y-3"
                                  data-testid="form-viewer-register"
                                >
                                  <div>
                                    <label htmlFor="inline-displayName" className="sr-only">Display Name</label>
                                    <Input id="inline-displayName" name="displayName" type="text" placeholder="Your name" required className="w-full bg-background/80 border-outline text-white placeholder:text-white/50" data-testid="input-name" defaultValue={globalAuth.viewerFirstName && globalAuth.viewerLastName ? `${globalAuth.viewerFirstName} ${globalAuth.viewerLastName}` : globalAuth.viewerFirstName || ''} />
                                  </div>
                                  <div>
                                    <label htmlFor="inline-email" className="sr-only">Email Address</label>
                                    <Input id="inline-email" name="email" type="email" placeholder="you@example.com" required className="w-full bg-background/80 border-outline text-white placeholder:text-white/50" data-testid="input-email" defaultValue={globalAuth.viewerEmail || ''} />
                                  </div>
                                  <TouchButton type="submit" disabled={viewer.isLoading || globalAuth.isLoading} variant="primary" className="w-full" data-testid="btn-submit-viewer-register">
                                    {viewer.isLoading || globalAuth.isLoading ? 'Registering...' : 'Register'}
                                  </TouchButton>
                                  {viewer.error && (
                                    <p className="text-xs text-destructive text-center" role="alert">{viewer.error}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground text-center">
                                    We&apos;ll send you a secure link to verify your email. No password required!
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

        {/* Debug Panel - shows in dev or with ?debug=true */}
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

