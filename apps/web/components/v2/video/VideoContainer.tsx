/**
 * VideoContainer Component
 * 
 * Wrapper component that maintains aspect ratio for video content
 */

import React from 'react';

export interface VideoContainerProps {
  /** Child elements (typically video player) */
  children: React.ReactNode;
  
  /** Aspect ratio for the container */
  aspectRatio?: '16:9' | '4:3' | '1:1' | '21:9';
  
  /** Whether to take full width */
  fullWidth?: boolean;
  
  /** Whether to apply rounded corners */
  rounded?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Test ID for automation */
  'data-testid'?: string;
}

/**
 * VideoContainer - Aspect ratio wrapper for video content
 * 
 * Maintains proper aspect ratio and provides consistent styling
 * for video players across the application.
 * 
 * @example
 * ```tsx
 * <VideoContainer aspectRatio="16:9" fullWidth>
 *   <video src="stream.m3u8" />
 * </VideoContainer>
 * ```
 */
export function VideoContainer({
  children,
  aspectRatio = '16:9',
  fullWidth = false,
  rounded = true,
  className = '',
  'data-testid': testId,
}: VideoContainerProps) {
  // Convert aspect ratio string to CSS value
  const aspectRatioValue = aspectRatio.replace(':', ' / ');
  
  return (
    <div
      data-testid={testId}
      className={`
        relative
        overflow-hidden
        bg-fv-bg-secondary
        ${fullWidth ? 'w-full' : ''}
        ${rounded ? 'rounded-lg' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      style={{
        aspectRatio: aspectRatioValue,
      }}
    >
      {/* Absolute positioned content to fill container */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

