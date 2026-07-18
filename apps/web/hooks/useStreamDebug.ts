/**
 * useStreamDebug Hook
 * 
 * Extracts debug information from HLS.js player instance
 */

import { useState, useEffect, useRef } from 'react';
import type { StreamDebugInfo } from '@/lib/debug/types';
import Hls from 'hls.js';

export function useStreamDebug(hlsInstance: Hls | null, videoElement: HTMLVideoElement | null, streamUrl: string | null) {
  const [debugInfo, setDebugInfo] = useState<StreamDebugInfo>({
    playerState: 'loading',
    hlsVersion: 'unknown',
    isLive: false,
    currentLevel: -1,
    currentBitrate: 0,
    availableLevels: [],
    autoLevelEnabled: true,
    bufferLength: 0,
    backBufferLength: 0,
    droppedFrames: 0,
    totalFrames: 0,
    timeToFirstFrame: 0,
    streamUrl: streamUrl || '',
    lastSegmentLoadTime: 0,
    bandwidth: 0,
    errorHistory: [],
  });

  const firstFrameTimeRef = useRef<number | null>(null);
  const errorHistoryRef = useRef<Array<{ type: string; message: string; timestamp: Date }>>([]);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hlsInstance || !videoElement) {
      setDebugInfo(prev => ({ ...prev, playerState: 'loading' }));
      return;
    }

    // Track start time
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    // Get HLS version
    const hlsVersion = (hlsInstance as any).version || 'unknown';

    // Update debug info periodically
    const updateInterval = setInterval(() => {
      const buffered = videoElement.buffered;
      const currentTime = videoElement.currentTime;
      let bufferLength = 0;
      
      if (buffered.length > 0) {
        const bufferedEnd = buffered.end(buffered.length - 1);
        bufferLength = bufferedEnd - currentTime;
      }

      // Get player state
      let playerState: StreamDebugInfo['playerState'] = 'loading';
      if (videoElement.readyState >= 2) {
        if (videoElement.paused) {
          playerState = 'paused';
        } else {
          playerState = 'playing';
        }
      } else if (videoElement.readyState === 1) {
        playerState = 'loading';
      } else if (videoElement.error) {
        playerState = 'error';
      }

      // Get HLS level info
      const levels = hlsInstance.levels || [];
      const currentLevel = hlsInstance.currentLevel;
      const autoLevelEnabled = hlsInstance.config?.autoStartLoad !== false;

      const availableLevels = levels.map((level: any) => ({
        resolution: level.width && level.height ? `${level.width}x${level.height}` : 'unknown',
        bitrate: level.bitrate || 0,
      }));

      const currentBitrate = currentLevel >= 0 && levels[currentLevel] 
        ? (levels[currentLevel] as any).bitrate || 0 
        : 0;

      // Get bandwidth estimate
      const bandwidth = (hlsInstance as any).bandwidthEstimate || 0;

      setDebugInfo(prev => ({
        ...prev,
        playerState,
        hlsVersion,
        isLive: (hlsInstance as any).liveSyncPosition !== null,
        currentLevel,
        currentBitrate,
        availableLevels,
        autoLevelEnabled,
        bufferLength,
        backBufferLength: (hlsInstance as any).config?.backBufferLength || 0,
        streamUrl: streamUrl || '',
        bandwidth,
        errorHistory: [...errorHistoryRef.current],
      }));
    }, 1000); // Update every second

    // Track time to first frame
    const handleCanPlay = () => {
      if (firstFrameTimeRef.current === null && startTimeRef.current) {
        firstFrameTimeRef.current = Date.now();
        const timeToFirstFrame = firstFrameTimeRef.current - startTimeRef.current;
        setDebugInfo(prev => ({ ...prev, timeToFirstFrame }));
      }
    };

    // Track errors
    const handleError = (_event: any, data: any) => {
      const errorEntry = {
        type: data.type || 'unknown',
        message: data.details || data.message || 'Unknown error',
        timestamp: new Date(),
      };
      errorHistoryRef.current.push(errorEntry);
      if (errorHistoryRef.current.length > 10) {
        errorHistoryRef.current.shift();
      }

      setDebugInfo(prev => ({
        ...prev,
        lastError: {
          type: data.fatal ? 'network' : 'media',
          fatal: data.fatal || false,
          details: data.details || data.message || 'Unknown error',
          timestamp: new Date(),
        },
        errorHistory: [...errorHistoryRef.current],
      }));
    };

    // Track segment load time
    const handleFragLoaded = (_event: any, data: any) => {
      if (data.frag) {
        const loadTime = data.stats?.tload || 0;
        setDebugInfo(prev => ({ ...prev, lastSegmentLoadTime: loadTime }));
      }
    };

    videoElement.addEventListener('canplay', handleCanPlay);
    // Access Hls.Events via the instance (hls.js exposes Events on the instance)
    const HlsEvents = (hlsInstance as any).Events || (hlsInstance.constructor as any).Events;
    if (HlsEvents) {
      hlsInstance.on(HlsEvents.ERROR, handleError);
      hlsInstance.on(HlsEvents.FRAG_LOADED, handleFragLoaded);
    }

    return () => {
      clearInterval(updateInterval);
      videoElement.removeEventListener('canplay', handleCanPlay);
      // Access Hls.Events via the instance
      const HlsEvents = (hlsInstance as any).Events || (hlsInstance.constructor as any).Events;
      if (HlsEvents) {
        hlsInstance.off(HlsEvents.ERROR, handleError);
        hlsInstance.off(HlsEvents.FRAG_LOADED, handleFragLoaded);
      }
    };
  }, [hlsInstance, videoElement, streamUrl]);

  return debugInfo;
}
