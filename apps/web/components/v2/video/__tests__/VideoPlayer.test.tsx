/**
 * VideoPlayer Component Tests
 * 
 * Tests for HTML5 video player
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayer } from '../VideoPlayer';

describe('VideoPlayer', () => {
  describe('rendering', () => {
    it('should render video element', () => {
      render(<VideoPlayer src="https://example.com/video.m3u8" />);
      
      const video = screen.getByTestId('video-player');
      expect(video).toBeInTheDocument();
      expect(video.tagName).toBe('VIDEO');
    });
    
    it('should apply data-testid when provided', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          data-testid="custom-video"
        />
      );
      
      expect(screen.getByTestId('custom-video')).toBeInTheDocument();
    });
    
    it('should set src attribute', () => {
      render(<VideoPlayer src="https://example.com/video.m3u8" />);
      
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video.src).toBe('https://example.com/video.m3u8');
    });
  });
  
  describe('props', () => {
    it('should apply autoPlay', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          autoPlay
        />
      );
      
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video.autoplay).toBe(true);
    });
    
    it('should apply muted', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          muted
        />
      );
      
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video.muted).toBe(true);
    });
    
    it('should apply loop', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          loop
        />
      );
      
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video.loop).toBe(true);
    });
    
    it('should apply playsInline', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          playsInline
        />
      );
      
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video.playsInline).toBe(true);
    });
    
    it('should apply controls', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          controls
        />
      );
      
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video.controls).toBe(true);
    });
    
    it('should set poster image', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          poster="https://example.com/poster.jpg"
        />
      );
      
      const video = screen.getByTestId('video-player') as HTMLVideoElement;
      expect(video.poster).toBe('https://example.com/poster.jpg');
    });
  });
  
  describe('event handlers', () => {
    it('should call onPlay when video plays', () => {
      const handlePlay = vi.fn();
      
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          onPlay={handlePlay}
        />
      );
      
      const video = screen.getByTestId('video-player');
      fireEvent.play(video);
      
      expect(handlePlay).toHaveBeenCalledTimes(1);
    });
    
    it('should call onPause when video pauses', () => {
      const handlePause = vi.fn();
      
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          onPause={handlePause}
        />
      );
      
      const video = screen.getByTestId('video-player');
      fireEvent.pause(video);
      
      expect(handlePause).toHaveBeenCalledTimes(1);
    });
    
    it('should call onTimeUpdate when time updates', () => {
      const handleTimeUpdate = vi.fn();
      
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          onTimeUpdate={handleTimeUpdate}
        />
      );
      
      const video = screen.getByTestId('video-player');
      fireEvent.timeUpdate(video);
      
      expect(handleTimeUpdate).toHaveBeenCalledTimes(1);
    });
    
    it('should call onEnded when video ends', () => {
      const handleEnded = vi.fn();
      
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          onEnded={handleEnded}
        />
      );
      
      const video = screen.getByTestId('video-player');
      fireEvent.ended(video);
      
      expect(handleEnded).toHaveBeenCalledTimes(1);
    });
    
    it('should call onError when video errors', () => {
      const handleError = vi.fn();
      
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          onError={handleError}
        />
      );
      
      const video = screen.getByTestId('video-player');
      fireEvent.error(video);
      
      expect(handleError).toHaveBeenCalledTimes(1);
    });
    
    it('should call onLoadedMetadata when metadata loads', () => {
      const handleLoadedMetadata = vi.fn();
      
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          onLoadedMetadata={handleLoadedMetadata}
        />
      );
      
      const video = screen.getByTestId('video-player');
      fireEvent.loadedMetadata(video);
      
      expect(handleLoadedMetadata).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('className', () => {
    it('should apply custom className', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          className="custom-video"
        />
      );
      
      const video = screen.getByTestId('video-player');
      expect(video).toHaveClass('custom-video');
    });
    
    it('should preserve base classes', () => {
      render(
        <VideoPlayer 
          src="https://example.com/video.m3u8"
          className="custom-video"
        />
      );
      
      const video = screen.getByTestId('video-player');
      expect(video).toHaveClass('w-full');
      expect(video).toHaveClass('h-full');
    });
  });
});

