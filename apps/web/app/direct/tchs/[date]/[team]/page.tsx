'use client';

/**
 * TCHS Team-Specific Direct Stream Page
 * Handles date/team-specific streams like /direct/tchs/20260106/SoccerVarsity
 * Uses DirectStreamPageBase with TCHS configuration
 */

import { DirectStreamPageBase, type DirectStreamPageConfig } from '@/components/DirectStreamPageBase';
import { TchsFullscreenChatOverlay } from '@/components/TchsFullscreenChatOverlay';
import { buildTchsStreamKey } from '@/lib/tchs-stream-key';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_TCHS_ADMIN_PASSWORD || 'tchs2026';

interface DirectTchsTeamPageProps {
  params: {
    date: string;
    team: string;
  };
}

export default function DirectTchsTeamPage({ params }: DirectTchsTeamPageProps) {
  const streamKey = buildTchsStreamKey({ date: params.date, team: params.team });
  const sharePath = `fieldview.live/direct/tchs/${params.date}/${params.team}`;

  // Format team name for display (e.g., "SoccerVarsity" -> "Soccer Varsity")
  const displayTeamName = params.team
    .replace(/([A-Z])/g, ' $1')
    .trim();

  const config: DirectStreamPageConfig = {
    // Data fetching
    bootstrapUrl: `/api/tchs/${streamKey}/bootstrap`,
    updateStreamUrl: `/api/tchs/${streamKey}`,
    
    // Display
    title: `TCHS ${displayTeamName}`,
    subtitle: `Live Stream • ${params.date}`,
    sharePath,
    
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
