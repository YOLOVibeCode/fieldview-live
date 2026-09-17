import type { NextFunction, Request, Response } from 'express';

/** Parse a Direct Stream URL key; supports parent/event and %2F-encoded slugs. */
export function parseDirectKey(raw: string): {
  key: string;
  parentSlug: string;
  eventSlug?: string;
} {
  const key = decodeURIComponent(raw || '').toLowerCase();
  const parts = key.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return {
      key: `${parts[0]}/${parts[1]}`,
      parentSlug: parts[0],
      eventSlug: parts[1],
    };
  }
  const parentSlug = parts[0] || key;
  return { key: parentSlug, parentSlug };
}

/**
 * Rewrite /parent/event/... to /parent%2Fevent/... so /:slug/leaf routes match.
 * Two-segment paths like /e2e-test/bootstrap are unchanged.
 */
export function rewriteHierarchicalDirectPath(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const raw = req.url || '';
  const qIndex = raw.indexOf('?');
  const pathOnly = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const qs = qIndex === -1 ? '' : raw.slice(qIndex);
  const m = pathOnly.match(/^\/([^/]+)\/([^/]+)\/(.+)$/);
  if (m) {
    const parent = m[1];
    const eventSlug = m[2];
    const rest = m[3];
    req.url = `/${encodeURIComponent(`${parent}/${eventSlug}`)}/${rest}${qs}`;
  }
  next();
}

/** Same rewrite under /api/public: /direct/parent/event/viewer/... */
export function rewriteHierarchicalPublicDirectPath(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const raw = req.url || '';
  const qIndex = raw.indexOf('?');
  const pathOnly = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const qs = qIndex === -1 ? '' : raw.slice(qIndex);
  const m = pathOnly.match(/^\/direct\/([^/]+)\/([^/]+)\/(.+)$/);
  if (m) {
    const parent = m[1];
    const eventSlug = m[2];
    const rest = m[3];
    req.url = `/direct/${encodeURIComponent(`${parent}/${eventSlug}`)}/${rest}${qs}`;
  }
  next();
}
