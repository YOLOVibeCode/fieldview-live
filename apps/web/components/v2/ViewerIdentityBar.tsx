'use client';

import Link from 'next/link';
import { useGlobalViewerAuth } from '@/hooks/useGlobalViewerAuth';

/**
 * Compact bar showing logged-in viewer identity with account link and sign-out action.
 * Renders nothing when not authenticated.
 */
export function ViewerIdentityBar() {
  const { viewerName, viewerEmail, isAuthenticated, clearViewerAuth, isLoading } = useGlobalViewerAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const isGuest = viewerEmail?.endsWith('@guest.fieldview.live');
  const displayLabel = isGuest ? 'Guest' : (viewerName || viewerEmail || 'Signed in');

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white border border-white/20"
      data-testid="viewer-identity-bar"
      role="region"
      aria-label="Viewer account"
    >
      <Link
        href="/account"
        className="truncate max-w-[140px] hover:text-blue-300 transition-colors"
        title={viewerEmail ?? undefined}
        data-testid="link-account"
        aria-label="View account settings"
      >
        {displayLabel}
      </Link>
      <button
        type="button"
        onClick={() => clearViewerAuth()}
        className="shrink-0 rounded px-1.5 py-0.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors text-xs font-medium"
        data-testid="btn-viewer-logout"
        aria-label="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}
