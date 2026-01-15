/**
 * VideoControls Component Tests
 * 
 * Tests for video player controls
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoControls } from '../VideoControls';

describe('VideoControls', () => {
  const defaultProps = {
    isPlaying: false,
    isMuted: false,
    volume: 1,
    currentTime: 0,
    duration: 100,
    onPlayPause: vi.fn(),
    onMuteToggle: vi.fn(),
    onVolumeChange: vi.fn(),
    onSeek: vi.fn(),
    onFullscreenToggle: vi.fn(),
  };
  
  describe('rendering', () => {
    it('should render all control buttons', () => {
      render(<VideoControls {...defaultProps} />);
      
      expect(screen.getByTestId('btn-play-pause')).toBeInTheDocument();
      expect(screen.getByTestId('btn-mute')).toBeInTheDocument();
      expect(screen.getByTestId('btn-fullscreen')).toBeInTheDocument();
    });
    
    it('should render progress bar', () => {
      render(<VideoControls {...defaultProps} />);
      
      expect(screen.getByTestId('video-progress')).toBeInTheDocument();
    });
    
    it('should render time display', () => {
      render(<VideoControls {...defaultProps} currentTime={30} duration={100} />);
      
      expect(screen.getByText(/0:30/)).toBeInTheDocument();
      expect(screen.getByText(/1:40/)).toBeInTheDocument();
    });
  });
  
  describe('play/pause button', () => {
    it('should show play icon when paused', () => {
      render(<VideoControls {...defaultProps} isPlaying={false} />);
      
      const button = screen.getByTestId('btn-play-pause');
      expect(button).toHaveAttribute('aria-label', 'Play');
    });
    
    it('should show pause icon when playing', () => {
      render(<VideoControls {...defaultProps} isPlaying={true} />);
      
      const button = screen.getByTestId('btn-play-pause');
      expect(button).toHaveAttribute('aria-label', 'Pause');
    });
    
    it('should call onPlayPause when clicked', async () => {
      const user = userEvent.setup();
      const handlePlayPause = vi.fn();
      
      render(<VideoControls {...defaultProps} onPlayPause={handlePlayPause} />);
      
      await user.click(screen.getByTestId('btn-play-pause'));
      
      expect(handlePlayPause).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('mute button', () => {
    it('should show unmuted icon when not muted', () => {
      render(<VideoControls {...defaultProps} isMuted={false} />);
      
      const button = screen.getByTestId('btn-mute');
      expect(button).toHaveAttribute('aria-label', 'Mute');
    });
    
    it('should show muted icon when muted', () => {
      render(<VideoControls {...defaultProps} isMuted={true} />);
      
      const button = screen.getByTestId('btn-mute');
      expect(button).toHaveAttribute('aria-label', 'Unmute');
    });
    
    it('should call onMuteToggle when clicked', async () => {
      const user = userEvent.setup();
      const handleMuteToggle = vi.fn();
      
      render(<VideoControls {...defaultProps} onMuteToggle={handleMuteToggle} />);
      
      await user.click(screen.getByTestId('btn-mute'));
      
      expect(handleMuteToggle).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('volume slider', () => {
    it('should display current volume', () => {
      render(<VideoControls {...defaultProps} volume={0.5} />);
      
      const slider = screen.getByTestId('volume-slider') as HTMLInputElement;
      expect(slider.value).toBe('0.5');
    });
    
    it('should call onVolumeChange when adjusted', async () => {
      const handleVolumeChange = vi.fn();
      
      render(<VideoControls {...defaultProps} onVolumeChange={handleVolumeChange} />);
      
      const slider = screen.getByTestId('volume-slider');
      fireEvent.change(slider, { target: { value: '0.7' } });
      
      expect(handleVolumeChange).toHaveBeenCalledWith(0.7);
    });
    
    it('should be hidden on mobile', () => {
      render(<VideoControls {...defaultProps} />);
      
      const slider = screen.getByTestId('volume-slider');
      expect(slider.parentElement).toHaveClass('hidden');
      expect(slider.parentElement).toHaveClass('md:flex');
    });
  });
  
  describe('progress bar', () => {
    it('should show current progress', () => {
      render(<VideoControls {...defaultProps} currentTime={25} duration={100} />);
      
      const progress = screen.getByTestId('video-progress') as HTMLInputElement;
      expect(progress.value).toBe('25');
      expect(progress.max).toBe('100');
    });
    
    it('should call onSeek when adjusted', async () => {
      const handleSeek = vi.fn();
      
      render(<VideoControls {...defaultProps} onSeek={handleSeek} />);
      
      const progress = screen.getByTestId('video-progress');
      fireEvent.change(progress, { target: { value: '50' } });
      
      expect(handleSeek).toHaveBeenCalledWith(50);
    });
  });
  
  describe('fullscreen button', () => {
    it('should have correct aria-label', () => {
      render(<VideoControls {...defaultProps} />);
      
      const button = screen.getByTestId('btn-fullscreen');
      expect(button).toHaveAttribute('aria-label', 'Fullscreen');
    });
    
    it('should call onFullscreenToggle when clicked', async () => {
      const user = userEvent.setup();
      const handleFullscreenToggle = vi.fn();
      
      render(<VideoControls {...defaultProps} onFullscreenToggle={handleFullscreenToggle} />);
      
      await user.click(screen.getByTestId('btn-fullscreen'));
      
      expect(handleFullscreenToggle).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('time formatting', () => {
    it('should format seconds correctly', () => {
      render(<VideoControls {...defaultProps} currentTime={65} duration={3665} />);
      
      const timeDisplay = screen.getByTestId('video-controls').querySelector('.font-mono');
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay?.textContent).toContain('1:05');
      expect(timeDisplay?.textContent).toContain('1:01:05');
    });
    
    it('should handle zero duration', () => {
      render(<VideoControls {...defaultProps} currentTime={0} duration={0} />);
      
      const timeDisplay = screen.getByTestId('video-controls').querySelector('.font-mono');
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay?.textContent).toContain('0:00');
    });
  });
});

