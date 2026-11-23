/**
 * Coach text commands: times, page links and provider names, as replies show them.
 */

import type { SourceReport } from '../../camera-sources/interfaces';
import { publicAppUrl } from '../config';
import type { AttachedPage } from '../interfaces';

/** `7:02 PM` in the account's time zone. */
export function clockTime(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(at);
}

/** `Sun 3:00 PM` in the account's time zone. */
export function dayTime(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone }).format(at);
}

/** The public game page. Viewers open it; it never carries the stream URL itself. */
export function pageUrl(page: Pick<AttachedPage, 'parentSlug' | 'eventSlug'>): string {
  return `${publicAppUrl()}/direct/${encodeURIComponent(page.parentSlug)}/${encodeURIComponent(page.eventSlug)}`;
}

/** Provider id to its display name, from the lookup's own source reports. */
export function providerNamer(sources: SourceReport[]): (provider: string) => string {
  const names = new Map(sources.map((source) => [source.provider, source.displayName]));
  return (provider) => names.get(provider) ?? (provider ? provider[0].toUpperCase() + provider.slice(1) : 'the camera');
}
