/**
 * DirectStreamPageV2 - Enhanced wrapper around DirectStreamPageBase
 * 
 * Applies v2 design system enhancements:
 * - Touch-optimized buttons (44px+ targets)
 * - Badge notifications
 * - Responsive breakpoints
 * - Polished animations
 * - Design tokens (--fv-*)
 */

'use client';

import React from 'react';
import { DirectStreamPageBase, type DirectStreamPageConfig } from './DirectStreamPageBase';
import { useResponsive } from '@/hooks/v2/useResponsive';
import '@/styles/v2/tokens.css';

export interface DirectStreamPageV2Props {
  config: DirectStreamPageConfig;
  children?: React.ReactNode;
}

/**
 * V2-enhanced direct stream page
 * 
 * Wraps DirectStreamPageBase with v2 design system enhancements
 */
export function DirectStreamPageV2({ config, children }: DirectStreamPageV2Props) {
  const { isMobile, isTouch } = useResponsive();

  return (
    <div className="fv-v2" data-mobile={isMobile} data-touch={isTouch}>
      <DirectStreamPageBase config={config}>
        {children}
      </DirectStreamPageBase>
    </div>
  );
}

export default DirectStreamPageV2;

