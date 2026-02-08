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
}

export function BookmarkPanel({
  isOpen,
  onClose,
  directStreamId,
  viewerId,
  onSeek,
  isMobile = false,
}: BookmarkPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('mine');

  if (!isOpen) return null;

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

  // Mobile: render inside BottomSheet
  if (isMobile) {
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
          className="text-white/70 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
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
