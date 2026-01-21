/**
 * DirectStream Unified Page (Parent + Events)
 * 
 * Routes:
 * - /direct/{slug} → Parent stream (no event segments)
 * - /direct/{slug}/{eventSlug} → Event page (one segment)
 * 
 * Example: /direct/tchs (parent) or /direct/tchs/soccer-20260109-varsity (event)
 */

import { DirectStreamPageBase, type DirectStreamPageConfig } from '@/components/DirectStreamPageBase';
import { notFound, redirect } from 'next/navigation';

interface DirectStreamEventPageProps {
  params: {
    slug: string;
    event?: string[];
  };
}

export default function DirectStreamEventPage({ params }: DirectStreamEventPageProps) {
  const slug = params.slug || '';
  const eventSegments = params.event || [];
  
  // Reconstruct the full slug (handles slugs with slashes like "tchs/soccer-20260120-jv2")
  const fullSlug = eventSegments.length > 0 
    ? `${slug}/${eventSegments.join('/')}`
    : slug;
  
  // Enforce lowercase URLs for consistency
  const hasUppercase = slug !== slug.toLowerCase() || eventSegments.some(seg => seg !== seg.toLowerCase());
  if (hasUppercase) {
    const lowercaseSlug = slug.toLowerCase();
    const lowercaseEvent = eventSegments.map(seg => seg.toLowerCase());
    const redirectPath = lowercaseEvent.length > 0
      ? `/direct/${lowercaseSlug}/${lowercaseEvent.join('/')}`
      : `/direct/${lowercaseSlug}`;
    redirect(redirectPath);
  }
  
  // Enforce one-level hierarchy (no deeply nested events)
  if (eventSegments.length > 1) {
    return notFound(); // 404 for deep nesting
  }
  
  // CASE 1: No event segments → Simple stream (e.g., /direct/stormfc)
  if (eventSegments.length === 0) {
    const displayName = slug
      .split(/(?=[A-Z])/)
      .join(' ')
      .replace(/^\w/, (c) => c.toUpperCase());
    
    const mainTitle = slug.replace(/^\w/, (c) => c.toUpperCase());
    
    const config: DirectStreamPageConfig = {
      bootstrapUrl: `/api/direct/${encodeURIComponent(fullSlug)}/bootstrap`,
      updateStreamUrl: `/api/direct/${encodeURIComponent(fullSlug)}`,
      title: `${mainTitle} Live Stream`,
      subtitle: displayName,
      sharePath: `fieldview.live/direct/${slug}/`,
    };
    
    return <DirectStreamPageBase config={config} />;
  }
  
  // CASE 2: One event segment → Could be event OR composite slug (e.g., /direct/tchs/soccer-20260120-jv2)
  // Try as composite slug first, fallback to event hierarchy
  const eventSlug = eventSegments[0];
  
  // Format display names
  const displayName = fullSlug
    .split(/[-_/]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const config: DirectStreamPageConfig = {
    // Try composite slug first (e.g., "tchs/soccer-20260120-jv2")
    bootstrapUrl: `/api/direct/${encodeURIComponent(fullSlug)}/bootstrap`,
    updateStreamUrl: `/api/direct/${encodeURIComponent(fullSlug)}`,
    title: displayName,
    subtitle: displayName,
    sharePath: `fieldview.live/direct/${slug}/${eventSlug}`,
  };

  return <DirectStreamPageBase config={config} />;
}

