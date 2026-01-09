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
  
  // CASE 1: No event segments → Parent stream
  if (eventSegments.length === 0) {
    const displayName = slug
      .split(/(?=[A-Z])/)
      .join(' ')
      .replace(/^\w/, (c) => c.toUpperCase());
    
    const mainTitle = slug.replace(/^\w/, (c) => c.toUpperCase());
    
    const config: DirectStreamPageConfig = {
      bootstrapUrl: `/api/direct/${slug}/bootstrap`,
      updateStreamUrl: `/api/direct/${slug}`,
      title: `${mainTitle} Live Stream`,
      subtitle: displayName,
      sharePath: `fieldview.live/direct/${slug}/`,
    };
    
    return <DirectStreamPageBase config={config} />;
  }
  
  // CASE 2: Event page
  const eventSlug = eventSegments[0];
  
  // Format display names
  const displayName = slug
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const eventDisplayName = eventSlug
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const config: DirectStreamPageConfig = {
    // Event-specific bootstrap endpoint
    bootstrapUrl: `/api/public/direct/${slug}/events/${eventSlug}/bootstrap`,
    updateStreamUrl: `/api/direct/${slug}`,
    title: `${displayName} - ${eventDisplayName}`,
    subtitle: eventDisplayName,
    sharePath: `fieldview.live/direct/${slug}/${eventSlug}`,
  };

  return <DirectStreamPageBase config={config} />;
}

