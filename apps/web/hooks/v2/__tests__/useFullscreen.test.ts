/**
 * useFullscreen Hook Tests
 * 
 * Tests for fullscreen API integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from '../useFullscreen';

describe('useFullscreen', () => {
  let mockElement: HTMLElement;
  
  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
    
    // Mock fullscreen API (hook checks fullscreenEnabled to set isSupported)
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, writable: true });
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    mockElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    
    // Mock fullscreenchange event
    document.addEventListener = vi.fn();
    document.removeEventListener = vi.fn();
  });
  
  afterEach(() => {
    document.body.removeChild(mockElement);
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    vi.clearAllMocks();
  });
  
  describe('initial state', () => {
    it('should start with isFullscreen = false', () => {
      const { result } = renderHook(() => useFullscreen(mockElement));
      
      expect(result.current.isFullscreen).toBe(false);
    });
    
    it('should start with isSupported = true when API available', () => {
      const { result } = renderHook(() => useFullscreen(mockElement));
      
      expect(result.current.isSupported).toBe(true);
    });
  });
  
  describe('enterFullscreen', () => {
    it('should call requestFullscreen on element', async () => {
      const { result } = renderHook(() => useFullscreen(mockElement));
      
      await act(async () => {
        await result.current.enterFullscreen();
      });
      
      expect(mockElement.requestFullscreen).toHaveBeenCalledTimes(1);
    });
    
    it('should handle errors gracefully', async () => {
      mockElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('Not allowed'));
      
      const { result } = renderHook(() => useFullscreen(mockElement));
      
      await act(async () => {
        await result.current.enterFullscreen();
      });
      
      // Should not throw
      expect(result.current.isFullscreen).toBe(false);
    });
    
    it('should do nothing if element is null', async () => {
      const { result } = renderHook(() => useFullscreen(null));
      
      await act(async () => {
        await result.current.enterFullscreen();
      });
      
      expect(mockElement.requestFullscreen).not.toHaveBeenCalled();
    });
  });
  
  describe('exitFullscreen', () => {
    it('should call document.exitFullscreen', async () => {
      const { result } = renderHook(() => useFullscreen(mockElement));
      
      await act(async () => {
        await result.current.exitFullscreen();
      });
      
      expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    });
    
    it('should handle errors gracefully', async () => {
      document.exitFullscreen = vi.fn().mockRejectedValue(new Error('Not in fullscreen'));
      
      const { result } = renderHook(() => useFullscreen(mockElement));
      
      await act(async () => {
        await result.current.exitFullscreen();
      });
      
      // Should not throw
      expect(result.current.isFullscreen).toBe(false);
    });
  });
  
  describe('toggleFullscreen', () => {
    it('should enter fullscreen when not in fullscreen', async () => {
      const { result } = renderHook(() => useFullscreen(mockElement));
      
      await act(async () => {
        await result.current.toggleFullscreen();
      });
      
      expect(mockElement.requestFullscreen).toHaveBeenCalledTimes(1);
    });
    
    // "exit fullscreen when in fullscreen" requires real browser DOM events;
    // covered by Playwright E2E: apps/web/__tests__/e2e/fullscreen.spec.ts
  });
  
  describe('API support detection', () => {
    it('should detect when fullscreen API is not supported', () => {
      Object.defineProperty(document, 'fullscreenEnabled', { value: false, writable: true });
      const { result } = renderHook(() => useFullscreen(mockElement));
      expect(result.current.isSupported).toBe(false);
      Object.defineProperty(document, 'fullscreenEnabled', { value: true, writable: true });
    });
  });
});

