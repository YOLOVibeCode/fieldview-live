/**
 * PortraitStreamLayout Component Tests
 *
 * Tests video section, CompactScoreBar, tabbed content, Chat/Bookmarks tab switching, badges.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { PortraitStreamLayout } from '../layout/PortraitStreamLayout';
import type { TeamData } from '../scoreboard/Scoreboard';

const defaultHomeTeam: TeamData = {
  name: 'Home',
  abbreviation: 'HOM',
  score: 2,
  color: '#3B82F6',
};

const defaultAwayTeam: TeamData = {
  name: 'Away',
  abbreviation: 'AWY',
  score: 1,
  color: '#EF4444',
};

const defaultProps = {
  videoSection: <div data-testid="video-section">Video</div>,
  homeTeam: defaultHomeTeam,
  awayTeam: defaultAwayTeam,
  scoreboardEnabled: true,
  scoreboardEditable: false,
  chatContent: <div data-testid="chat-content">Chat</div>,
  chatMessageCount: 3,
  chatEnabled: true,
  bookmarkContent: <div data-testid="bookmark-content">Bookmarks</div>,
  bookmarkCount: 2,
  bookmarksAvailable: true,
};

describe('PortraitStreamLayout', () => {
  describe('rendering', () => {
    it('should render video section', () => {
      render(<PortraitStreamLayout {...defaultProps} />);
      expect(screen.getByTestId('video-section')).toBeInTheDocument();
    });

    it('should render CompactScoreBar when scoreboardEnabled', () => {
      render(<PortraitStreamLayout {...defaultProps} />);
      expect(screen.getByTestId('compact-score-bar')).toBeInTheDocument();
    });

    it('should not render CompactScoreBar when scoreboardEnabled is false', () => {
      render(<PortraitStreamLayout {...defaultProps} scoreboardEnabled={false} />);
      expect(screen.queryByTestId('compact-score-bar')).not.toBeInTheDocument();
    });

    it('should render Chat and Bookmarks tabs when chatEnabled and bookmarksAvailable', () => {
      render(<PortraitStreamLayout {...defaultProps} />);
      expect(screen.getByTestId('portrait-tab-chat')).toHaveTextContent('Chat');
      expect(screen.getByTestId('portrait-tab-bookmarks')).toHaveTextContent('Bookmarks');
    });

    it('should show chat content by default', () => {
      render(<PortraitStreamLayout {...defaultProps} />);
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
      expect(screen.queryByTestId('bookmark-content')).not.toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('should switch to bookmarks content when Bookmarks tab clicked', () => {
      render(<PortraitStreamLayout {...defaultProps} />);
      fireEvent.click(screen.getByTestId('portrait-tab-bookmarks'));
      expect(screen.getByTestId('bookmark-content')).toBeInTheDocument();
      expect(screen.queryByTestId('chat-content')).not.toBeInTheDocument();
    });

    it('should call onTabChange when tab clicked and prop provided', () => {
      const onTabChange = vi.fn();
      render(<PortraitStreamLayout {...defaultProps} onTabChange={onTabChange} />);
      fireEvent.click(screen.getByTestId('portrait-tab-bookmarks'));
      expect(onTabChange).toHaveBeenCalledWith('bookmarks');
    });
  });

  describe('badges', () => {
    it('should show chat message count badge when count > 0 and tab not active', () => {
      render(<PortraitStreamLayout {...defaultProps} chatMessageCount={5} />);
      fireEvent.click(screen.getByTestId('portrait-tab-bookmarks'));
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show bookmark count badge when count > 0 and tab not active', () => {
      render(<PortraitStreamLayout {...defaultProps} bookmarkCount={4} />);
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('scoreboard', () => {
    it('should render expanded scoreboard area when CompactScoreBar toggle clicked', () => {
      render(<PortraitStreamLayout {...defaultProps} />);
      expect(screen.getByTestId('scoreboard-portrait-expanded')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('compact-score-bar'));
      expect(screen.getByTestId('scoreboard-portrait-expanded')).toBeInTheDocument();
    });
  });
});
