/**
 * Lite Viewer Route (Proof of Concept)
 *
 * Parallel to /direct/[slug]/[[...event]] — reuses the identical bootstrap URL
 * builder but renders the thin LiteViewer (single <video> + hls.js, wrapper-
 * owned fullscreen, custom overlays). The existing /direct route is untouched.
 *
 * Routes:
 * - /lite/{slug}                  → parent stream
 * - /lite/{slug}/{eventSlug}      → event or composite slug
 */

import { notFound, redirect } from 'next/navigation';
import { LiteViewer, type LiteViewerConfig } from '@/components/lite/LiteViewer';

interface LitePageProps {
  params: {
    slug: string;
    event?: string[];
  };
}

export default function LiteViewerPage({ params }: LitePageProps) {
  const slug = params.slug || '';
  const eventSegments = params.event || [];

  const fullSlug =
    eventSegments.length > 0 ? `${slug}/${eventSegments.join('/')}` : slug;

  // Enforce lowercase URLs for consistency (mirrors /direct route).
  const hasUppercase =
    slug !== slug.toLowerCase() ||
    eventSegments.some((seg) => seg !== seg.toLowerCase());
  if (hasUppercase) {
    const lowercaseEvent = eventSegments.map((seg) => seg.toLowerCase());
    const redirectPath =
      lowercaseEvent.length > 0
        ? `/lite/${slug.toLowerCase()}/${lowercaseEvent.join('/')}`
        : `/lite/${slug.toLowerCase()}`;
    redirect(redirectPath);
  }

  // Enforce one-level hierarchy (no deeply nested events).
  if (eventSegments.length > 1) {
    return notFound();
  }

  const displayName = fullSlug
    .split(/[-_/]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const config: LiteViewerConfig = {
    bootstrapUrl: `/api/direct/${encodeURIComponent(fullSlug)}/bootstrap`,
    title: displayName,
  };

  return <LiteViewer config={config} />;
}
