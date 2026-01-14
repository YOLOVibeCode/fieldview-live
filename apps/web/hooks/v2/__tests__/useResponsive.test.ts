/**
 * useResponsive Hook Tests
 * 
 * Tests for responsive behavior detection
 */

import { renderHook, act } from '@testing-library/react';
import { useResponsive, useBreakpoint, useIsMobile, useIsTouch } from '../useResponsive';
import { mockWindowSize, mockTouchSupport, setViewport, VIEWPORTS } from '@/lib/v2/test-utils';

describe('useResponsive', () => {
  beforeEach(() => {
    // Reset to mobile viewport
    mockWindowSize(375, 667);
    mockTouchSupport(true);
  });
  
  describe('breakpoint detection', () => {
    it('should detect xs breakpoint (< 375px)', () => {
      mockWindowSize(350, 667);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.breakpoint).toBe('xs');
      expect(result.current.isMobile).toBe(true);
    });
    
    it('should detect sm breakpoint (375-639px)', () => {
      mockWindowSize(375, 667);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.breakpoint).toBe('sm');
      expect(result.current.isMobile).toBe(true);
    });
    
    it('should detect md breakpoint (640-1023px)', () => {
      mockWindowSize(768, 1024);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.breakpoint).toBe('md');
      expect(result.current.isTablet).toBe(true);
    });
    
    it('should detect lg breakpoint (1024-1439px)', () => {
      mockWindowSize(1280, 800);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.breakpoint).toBe('lg');
      expect(result.current.isDesktop).toBe(true);
    });
    
    it('should detect xl breakpoint (≥ 1440px)', () => {
      mockWindowSize(1920, 1080);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.breakpoint).toBe('xl');
      expect(result.current.isDesktop).toBe(true);
    });
  });
  
  describe('orientation detection', () => {
    it('should detect portrait orientation', () => {
      mockWindowSize(375, 667);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.orientation).toBe('portrait');
    });
    
    it('should detect landscape orientation', () => {
      mockWindowSize(667, 375);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.orientation).toBe('landscape');
    });
  });
  
  describe('touch detection', () => {
    it('should detect touch support', () => {
      mockTouchSupport(true);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isTouch).toBe(true);
    });
    
    it('should detect no touch support', () => {
      mockTouchSupport(false);
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isTouch).toBe(false);
    });
  });
  
  describe('layout decisions', () => {
    it('should show bottom nav on mobile', () => {
      setViewport('iPhoneSE');
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.showBottomNav).toBe(true);
      expect(result.current.showSidePanel).toBe(false);
    });
    
    it('should show side panel on desktop', () => {
      setViewport('desktop1080p');
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.showBottomNav).toBe(false);
      expect(result.current.showSidePanel).toBe(true);
    });
    
    it('should set scoreboard position to floating on mobile', () => {
      setViewport('iPhoneSE');
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.scoreboardPosition).toBe('floating');
    });
    
    it('should set scoreboard position to sidebar on desktop', () => {
      setViewport('desktop1080p');
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.scoreboardPosition).toBe('sidebar');
    });
    
    it('should set chat position to bottom-sheet on mobile', () => {
      setViewport('iPhoneSE');
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.chatPosition).toBe('bottom-sheet');
    });
    
    it('should set chat position to sidebar on desktop', () => {
      setViewport('desktop1080p');
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.chatPosition).toBe('sidebar');
    });
  });
  
  describe('responsive updates', () => {
    it('should update on window resize', () => {
      const { result } = renderHook(() => useResponsive());
      
      // Start mobile
      expect(result.current.isMobile).toBe(true);
      
      // Resize to desktop
      act(() => {
        mockWindowSize(1920, 1080);
      });
      
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });
    
    it('should update on orientation change', () => {
      const { result } = renderHook(() => useResponsive());
      
      // Start portrait
      expect(result.current.orientation).toBe('portrait');
      
      // Change to landscape
      act(() => {
        mockWindowSize(667, 375);
        window.dispatchEvent(new Event('orientationchange'));
      });
      
      expect(result.current.orientation).toBe('landscape');
    });
  });
  
  describe('viewport presets', () => {
    it('should correctly detect iPhone SE', () => {
      setViewport('iPhoneSE');
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.width).toBe(VIEWPORTS.iPhoneSE.width);
      expect(result.current.height).toBe(VIEWPORTS.iPhoneSE.height);
      expect(result.current.isMobile).toBe(true);
    });
    
    it('should correctly detect iPad Pro', () => {
      setViewport('iPadPro');
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.width).toBe(VIEWPORTS.iPadPro.width);
      expect(result.current.height).toBe(VIEWPORTS.iPadPro.height);
      expect(result.current.isDesktop).toBe(true);
    });
  });
});

describe('useBreakpoint', () => {
  it('should return current breakpoint', () => {
    mockWindowSize(375, 667);
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current).toBe('sm');
  });
});

describe('useIsMobile', () => {
  it('should return true on mobile', () => {
    mockWindowSize(375, 667);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(true);
  });
  
  it('should return false on desktop', () => {
    mockWindowSize(1920, 1080);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);
  });
});

describe('useIsTouch', () => {
  it('should return true with touch support', () => {
    mockTouchSupport(true);
    const { result } = renderHook(() => useIsTouch());
    
    expect(result.current).toBe(true);
  });
  
  it('should return false without touch support', () => {
    mockTouchSupport(false);
    const { result } = renderHook(() => useIsTouch());
    
    expect(result.current).toBe(false);
  });
});

