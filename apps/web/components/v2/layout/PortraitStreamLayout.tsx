'use client';

/**
 * PortraitStreamLayout - Mobile portrait layout for live streams
 *
 * Vertical stack: Video → CompactScoreBar → Tabbed Chat/Bookmarks
 * Eliminates dead space below the video player.
 */

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CompactScoreBar } from '@/components/v2/scoreboard/CompactScoreBar';
import { Scoreboard, type TeamData } from '@/components/v2/scoreboard';
import { Badge } from '@/components/v2/primitives';

export type PortraitTab = 'chat' | 'bookmarks';

export interface PortraitStreamLayoutProps {
  /** Video player + overlays (StreamPlayer, status overlays, bookmark controls, paywall) */
  videoSection: ReactNode;

  /** Scoreboard data */
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
  scoreboardEnabled: boolean;
  scoreboardEditable: boolean;
  onScoreUpdate?: (team: 'home' | 'away', newScore: number) => void;

  /** Chat content (rendered as embedded) */
  chatContent: ReactNode;
  chatMessageCount: number;
  chatEnabled: boolean;

  /** Bookmark panel content (rendered inline) */
  bookmarkContent: ReactNode;
  bookmarkCount: number;
  bookmarksAvailable: boolean;

  /** External tab control (optional - for keyboard shortcut integration) */
  activeTab?: PortraitTab;
  onTabChange?: (tab: PortraitTab) => void;
}

export function PortraitStreamLayout({
  videoSection,
  homeTeam,
  awayTeam,
  period,
  time,
  scoreboardEnabled,
  scoreboardEditable,
  onScoreUpdate,
  chatContent,
  chatMessageCount,
  chatEnabled,
  bookmarkContent,
  bookmarkCount,
  bookmarksAvailable,
  activeTab: controlledTab,
  onTabChange,
}: PortraitStreamLayoutProps) {
  const [internalTab, setInternalTab] = useState<PortraitTab>('chat');
  const [scoreboardExpanded, setScoreboardExpanded] = useState(false);

  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const showTabs = chatEnabled || bookmarksAvailable;

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Video section — fixed height from aspect ratio */}
      <div className="relative w-full aspect-video shrink-0 bg-black">
        {videoSection}
      </div>

      {/* Compact score bar — always visible when scoreboard enabled */}
      {scoreboardEnabled && (
        <CompactScoreBar
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          time={time}
          isExpanded={scoreboardExpanded}
          onToggleExpand={() => setScoreboardExpanded(prev => !prev)}
        />
      )}

      {/* Expanded scoreboard — animates open/closed */}
      {scoreboardEnabled && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-out shrink-0',
            'bg-[var(--fv-color-bg-secondary)]/90 backdrop-blur-md',
            scoreboardExpanded
              ? 'max-h-[min(180px,30vh)] opacity-100 border-b border-[var(--fv-color-border)]'
              : 'max-h-0 opacity-0',
          )}
        >
          <div className="p-3">
            <Scoreboard
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              period={period}
              time={time}
              mode="minimal"
              editable={scoreboardEditable}
              onScoreUpdate={onScoreUpdate}
              data-testid="scoreboard-portrait-expanded"
            />
          </div>
        </div>
      )}

      {/* Tab bar: Chat / Bookmarks */}
      {showTabs && (
        <div
          className={cn(
            'flex shrink-0 h-11',
            'border-b border-[var(--fv-color-border)]',
            'bg-[var(--fv-color-bg-secondary)]',
          )}
        >
          {chatEnabled && (
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'text-sm font-medium transition-colors',
                activeTab === 'chat'
                  ? 'text-[var(--fv-color-primary-400,#60A5FA)] border-b-2 border-[var(--fv-color-primary-400,#60A5FA)]'
                  : 'text-[var(--fv-color-text-muted)]',
              )}
              data-testid="portrait-tab-chat"
            >
              Chat
              {chatMessageCount > 0 && activeTab !== 'chat' && (
                <Badge count={chatMessageCount} max={9} color="primary" />
              )}
            </button>
          )}
          {bookmarksAvailable && (
            <button
              type="button"
              onClick={() => setActiveTab('bookmarks')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'text-sm font-medium transition-colors',
                activeTab === 'bookmarks'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-[var(--fv-color-text-muted)]',
              )}
              data-testid="portrait-tab-bookmarks"
            >
              Bookmarks
              {bookmarkCount > 0 && activeTab !== 'bookmarks' && (
                <Badge count={bookmarkCount} max={9} color="warning" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Tab content — fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'chat' && chatEnabled ? (
          chatContent
        ) : activeTab === 'bookmarks' && bookmarksAvailable ? (
          bookmarkContent
        ) : (
          // Fallback when nothing is enabled
          <div className="flex-1 flex items-center justify-center text-[var(--fv-color-text-muted)] text-sm">
            Stream is live
          </div>
        )}
      </div>

      {/* Safe area bottom spacer */}
      <div className="shrink-0 pb-[env(safe-area-inset-bottom,0px)]" />
    </div>
  );
}
