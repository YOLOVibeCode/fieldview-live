/**
 * VideoContainer Component Tests
 * 
 * Tests for aspect ratio video container
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoContainer } from '../VideoContainer';

describe('VideoContainer', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <VideoContainer>
          <div data-testid="child">Video Element</div>
        </VideoContainer>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
    
    it('should apply data-testid when provided', () => {
      render(
        <VideoContainer data-testid="video-container">
          <div>Content</div>
        </VideoContainer>
      );
      
      expect(screen.getByTestId('video-container')).toBeInTheDocument();
    });
  });
  
  describe('aspect ratio', () => {
    it('should default to 16:9 aspect ratio', () => {
      const { container } = render(
        <VideoContainer>
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: '16 / 9' });
    });
    
    it('should apply 4:3 aspect ratio', () => {
      const { container } = render(
        <VideoContainer aspectRatio="4:3">
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: '4 / 3' });
    });
    
    it('should apply 1:1 aspect ratio', () => {
      const { container } = render(
        <VideoContainer aspectRatio="1:1">
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: '1 / 1' });
    });
    
    it('should apply 21:9 aspect ratio', () => {
      const { container } = render(
        <VideoContainer aspectRatio="21:9">
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: '21 / 9' });
    });
  });
  
  describe('className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <VideoContainer className="custom-class">
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });
    
    it('should preserve base classes when adding custom className', () => {
      const { container } = render(
        <VideoContainer className="custom-class">
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
      expect(wrapper.className).toContain('relative');
    });
  });
  
  describe('fullWidth', () => {
    it('should apply full width when true', () => {
      const { container } = render(
        <VideoContainer fullWidth>
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('w-full');
    });
    
    it('should not apply full width by default', () => {
      const { container } = render(
        <VideoContainer>
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveClass('w-full');
    });
  });
  
  describe('rounded corners', () => {
    it('should apply rounded corners by default', () => {
      const { container } = render(
        <VideoContainer>
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('rounded-lg');
    });
    
    it('should not apply rounded corners when rounded is false', () => {
      const { container } = render(
        <VideoContainer rounded={false}>
          <div>Content</div>
        </VideoContainer>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveClass('rounded-lg');
    });
  });
});

