'use client';

/**
 * BookmarkPanel - Slide-out drawer for bookmark management.
 *
 * Wraps the existing BookmarksList with tab filtering (My / All).
 * Supports seek-to-bookmark and clip creation via the existing component.
 */

import { useState } from 'react';
import { BookmarksList } from '@/components/dvr/BookmarksList';
import { BottomSheet } from '@/components/v2/primitives/BottomSheet';

type TabKey = 'mine' | 'all';

interface BookmarkPanelProps {
  isOpen: boolean;
  onClose: () => void;
  directStreamId: string;
  viewerId: string;
  onSeek: (timeSeconds: number) => void;
  isMobile?: boolean;
  /** Render mode: 'sheet' (mobile BottomSheet), 'sidebar' (desktop), 'inline' (embedded in parent) */
  mode?: 'sheet' | 'sidebar' | 'inline';
}

export function BookmarkPanel({
  isOpen,
  onClose,
  directStreamId,
  viewerId,
  onSeek,
  isMobile = false,
  mode,
}: BookmarkPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('mine');

  // Determine effective mode
  const effectiveMode = mode ?? (isMobile ? 'sheet' : 'sidebar');

  if (!isOpen && effectiveMode !== 'inline') return null;

  const tabs = (
    <div className="flex border-b border-white/10">
      {([
        { key: 'mine' as TabKey, label: 'My Bookmarks' },
        { key: 'all' as TabKey, label: 'All Shared' },
      ]).map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors
            ${activeTab === tab.key
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-white/60 hover:text-white/80'
            }`}
          data-testid={`tab-${tab.key}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const content = (
    <div className="flex-1 overflow-y-auto min-h-0">
      {activeTab === 'mine' ? (
        <BookmarksList
          viewerId={viewerId}
          directStreamId={directStreamId}
          onSeek={onSeek}
        />
      ) : (
        <BookmarksList
          directStreamId={directStreamId}
          includeShared
          onSeek={onSeek}
        />
      )}
    </div>
  );

  // Inline: render collapse header + tabs + list (portrait layout — collapsible in all views)
  if (effectiveMode === 'inline') {
    return (
      <div className="flex flex-col h-full" data-testid="bookmark-panel-inline">
        {/* Collapse header: back/close so bookmarks are collapsible in portrait like other views */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[var(--fv-color-bg-secondary)]/80 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--fv-color-text-muted)] hover:text-[var(--fv-color-text)] transition-colors min-h-[44px] min-w-[44px] -ml-1 rounded"
            aria-label="Back to chat"
            data-testid="btn-collapse-bookmark-inline"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Chat</span>
          </button>
          <span className="text-sm font-semibold text-white">Bookmarks</span>
        </div>
        {tabs}
        {content}
      </div>
    );
  }

  // Mobile: render inside BottomSheet
  if (effectiveMode === 'sheet') {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        snapPoints={[0.6, 0.85]}
        initialSnap={0}
        enableDrag
        aria-labelledby="bookmark-panel-title"
      >
        <h3 id="bookmark-panel-title" className="text-lg font-bold text-white mb-3 -mt-2">Bookmarks</h3>
        {tabs}
        <div className="-mx-6 flex-1 min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
          {content}
        </div>
      </BottomSheet>
    );
  }

  // Desktop/Tablet: fixed right sidebar
  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40
        w-[360px] max-h-[80vh]
        bg-black/95 backdrop-blur-md
        border-l-2 border-white/20
        rounded-l-lg shadow-2xl shadow-amber-500/10
        flex flex-col
        transition-transform duration-300 ease-in-out"
      data-testid="bookmark-panel"
      role="dialog"
      aria-modal="false"
      aria-label="Bookmarks panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Bookmarks</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10 p-2 min-h-[44px] min-w-[44px] rounded transition-colors flex items-center justify-center"
          aria-label="Close bookmarks"
          data-testid="btn-close-bookmark-panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {tabs}
      {content}
    </div>
  );
}
