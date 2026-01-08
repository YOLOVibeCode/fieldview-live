'use client';

/**
 * TCHS Direct Stream Page
 * Uses DirectStreamPageBase with TCHS-specific configuration
 */

import { DirectStreamPageBase, type DirectStreamPageConfig } from '@/components/DirectStreamPageBase';
import { TchsFullscreenChatOverlay } from '@/components/TchsFullscreenChatOverlay';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_TCHS_ADMIN_PASSWORD || 'tchs2026';

export default function DirectTchsPage() {
  const config: DirectStreamPageConfig = {
    // Data fetching
    bootstrapUrl: `/api/direct/tchs/bootstrap`,
    updateStreamUrl: `/api/direct/tchs`,
    
    // Display
    title: 'TCHS Live Stream',
    subtitle: 'Twin Cities High School',
    sharePath: 'fieldview.live/direct/tchs/',
    
    // Branding
    headerClassName: 'bg-gradient-to-r from-blue-900 to-blue-800',
    
    // Components
    ChatOverlayComponent: TchsFullscreenChatOverlay,
    
    // Features
    enableFontSize: true,
    fontSizeStorageKey: 'tchs_chat_font_size',
    adminPassword: ADMIN_PASSWORD,
  };

  return <DirectStreamPageBase config={config} />;
}
