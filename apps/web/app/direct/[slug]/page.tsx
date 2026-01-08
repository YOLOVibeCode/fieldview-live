'use client';

/**
 * Generic Direct Stream Page
 * Uses DirectStreamPageBase with default configuration
 */

import { DirectStreamPageBase, type DirectStreamPageConfig } from '@/components/DirectStreamPageBase';

interface DirectStreamPageProps {
  params: {
    slug: string;
  };
}

export default function DirectStreamPage({ params }: DirectStreamPageProps) {
  const slug = params.slug || '';

  // Format slug for display (e.g., "StormFC" -> "Storm FC")
  const displayName = slug
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/^\w/, (c) => c.toUpperCase());

  // Use original slug for main title to preserve "StormFC" format
  const mainTitle = slug.replace(/^\w/, (c) => c.toUpperCase());

  const config: DirectStreamPageConfig = {
    // Data fetching
    bootstrapUrl: `/api/direct/${slug}/bootstrap`,
    updateStreamUrl: `/api/direct/${slug}`,
    
    // Display
    title: `${mainTitle} Live Stream`,
    subtitle: displayName,
    sharePath: `fieldview.live/direct/${slug}/`,
    
    // Features
    adminPassword: 'admin2026',
  };

  return <DirectStreamPageBase config={config} />;
}
