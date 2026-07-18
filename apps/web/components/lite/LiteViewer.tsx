/**
 * LiteViewer
 *
 * Self-contained "Lite" stream viewer. ONE wrapper element owns the <video>
 * surface, every overlay, and fullscreen — so overlays survive fullscreen on
 * all platforms (real Fullscreen API on desktop/Android/iPad; CSS fake
 * fullscreen on iPhone). Reuses all existing data/auth/SSE hooks unchanged;
 * it does not touch the legacy DirectStreamPageBase viewer.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { useScoreboardData } from '@/hooks/useScoreboardData';
import { useGameChatV2 } from '@/hooks/useGameChatV2';
import { useViewerCount } from '@/hooks/useViewerCount';
import { usePaywall } from '@/hooks/usePaywall';
import { useViewportFullscreen } from '@/hooks/useViewportFullscreen';
import { LiteVideoPlayer, type LiteStreamStatus } from './LiteVideoPlayer';
import {
  LiteScoreboardOverlay,
  LiteViewerCountBadge,
  LiteChatOverlay,
  LiteControls,
  LiteStatusOverlay,
  LitePaywallGate,
} from './LiteOverlays';

/** Minimal slice of the bootstrap response the Lite viewer needs. */
export interface LiteBootstrap {
  slug: string;
  gameId: string | null;
  streamUrl: string | null;
  title: string;
  chatEnabled: boolean;
  scoreboardEnabled: boolean;
  paywallEnabled?: boolean;
  priceInCents?: number;
  paywallMessage?: string | null;
  allowViewerScoreEdit?: boolean;
  allowAnonymousChat?: boolean;
  streamProvider?: string | null;
  muxPlaybackId?: string | null;
}

export interface LiteViewerConfig {
  /** e.g. /api/direct/{slug}/bootstrap */
  bootstrapUrl: string;
  title: string;
}

export function LiteViewer({ config }: { config: LiteViewerConfig }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [bootstrap, setBootstrap] = useState<LiteBootstrap | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [status, setStatus] = useState<LiteStreamStatus>('loading');
  const [muted, setMuted] = useState(true);

  const slug = bootstrap?.slug ?? null;
  const gameId = bootstrap?.gameId ?? null;

  // --- Bootstrap -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    apiRequest<LiteBootstrap>(config.bootstrapUrl, { retries: 1 })
      .then((data) => {
        if (!cancelled) setBootstrap(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[LiteViewer] bootstrap failed:', err);
          setBootstrapError('Unable to load stream');
          setStatus('offline');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [config.bootstrapUrl]);

  // --- Viewer identity (email unlock + anonymous auto-connect) -------------
  const viewer = useViewerIdentity({ gameId, slug: slug ?? undefined });

  useEffect(() => {
    if (!bootstrap || viewer.isUnlocked || !bootstrap.allowAnonymousChat) return;
    let cancelled = false;

    (async () => {
      try {
        const storageKey = 'fieldview_anon_session';
        let sessionId = localStorage.getItem(storageKey);
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem(storageKey, sessionId);
        }
        const savedName =
          localStorage.getItem(`fieldview_guest_name_${bootstrap.slug}`) || undefined;

        const data = await apiRequest<{
          viewerToken: string;
          viewer: { id: string; displayName: string };
          gameId: string;
        }>(`/api/public/direct/${encodeURIComponent(bootstrap.slug)}/viewer/anonymous-token`, {
          method: 'POST',
          body: JSON.stringify({ sessionId, displayName: savedName }),
        });

        if (cancelled) return;
        viewer.setExternalIdentity({
          viewerToken: data.viewerToken,
          viewerId: data.viewer.id,
          displayName: data.viewer.displayName,
          gameId: data.gameId,
          email: `anon-${sessionId}@guest.fieldview.live`,
        });
      } catch (err) {
        console.error('[LiteViewer] anonymous connect failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap, viewer.isUnlocked]);

  // --- Paywall -------------------------------------------------------------
  const paywall = usePaywall({
    slug: slug ?? '',
    enabled: !!bootstrap?.paywallEnabled,
  });

  // --- Data hooks ----------------------------------------------------------
  const scoreboard = useScoreboardData({
    slug,
    enabled: !!bootstrap?.scoreboardEnabled && !paywall.isBlocked,
    viewerToken: viewer.token,
    allowAnonymousEdit: false,
  });

  const chat = useGameChatV2({
    gameId,
    viewerToken: viewer.token,
    enabled: !!bootstrap?.chatEnabled && viewer.isUnlocked && !paywall.isBlocked,
    currentUserId: viewer.viewerId ?? undefined,
  });

  const { count } = useViewerCount({
    slug,
    enabled: !!slug && !paywall.isBlocked,
  });

  // --- Fullscreen (the core fix) ------------------------------------------
  const fs = useViewportFullscreen(wrapperRef.current);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const wrapperClass = useMemo(
    () =>
      [
        'relative w-full overflow-hidden bg-black',
        fs.isFakeFullscreen
          ? 'fixed inset-0 z-[2147483647] h-[100dvh] w-screen'
          : 'aspect-video',
      ].join(' '),
    [fs.isFakeFullscreen]
  );

  const showChat =
    !!bootstrap?.chatEnabled && viewer.isUnlocked && !paywall.isBlocked;
  const showScoreboard = !!bootstrap?.scoreboardEnabled && !paywall.isBlocked;

  return (
    <div className="mx-auto w-full max-w-5xl p-0 sm:p-4">
      <h1 className="sr-only">{config.title}</h1>
      <div
        ref={wrapperRef}
        data-testid="lite-viewer-container"
        data-fake-fullscreen={fs.isFakeFullscreen ? 'true' : 'false'}
        className={wrapperClass}
      >
        <LiteVideoPlayer
          streamUrl={bootstrap?.streamUrl ?? null}
          streamProvider={bootstrap?.streamProvider}
          muxPlaybackId={bootstrap?.muxPlaybackId}
          muted={muted}
          className="absolute inset-0 h-full w-full"
          onStatusChange={setStatus}
        />

        {/* Overlay layer — children stay visible in fullscreen */}
        <div data-testid="lite-overlay-layer" className="pointer-events-none absolute inset-0">
          {showScoreboard && (
            <LiteScoreboardOverlay
              homeTeam={scoreboard.homeTeam}
              awayTeam={scoreboard.awayTeam}
              period={scoreboard.period}
              time={scoreboard.time}
            />
          )}

          {!paywall.isBlocked && <LiteViewerCountBadge count={count} />}

          {showChat && (
            <LiteChatOverlay
              messages={chat.messages}
              onSend={chat.sendMessage}
              connected={chat.isConnected}
            />
          )}

          <LiteControls
            isFullscreen={fs.isFullscreen}
            onToggleFullscreen={() => void fs.toggle()}
            muted={muted}
            onToggleMute={toggleMute}
          />
        </div>

        {!paywall.isBlocked && <LiteStatusOverlay status={status} />}

        {paywall.isBlocked && (
          <LitePaywallGate
            priceInCents={paywall.priceInCents}
            message={paywall.customMessage}
            onUnlock={paywall.openPaywall}
          />
        )}
      </div>

      {bootstrapError && (
        <p data-testid="lite-bootstrap-error" className="p-4 text-sm text-red-600">
          {bootstrapError}
        </p>
      )}
    </div>
  );
}
