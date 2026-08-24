/**
 * Parse/load a playback source for the multi-channel overlay PoC.
 * Accepts an HLS URL, a FieldView slug, or empty (default Mux clip).
 */

export const DEFAULT_DEMO_STREAM =
  'https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU.m3u8';

export type ParsedDemoStream =
  | { kind: 'url'; url: string }
  | { kind: 'slug'; slug: string };

function slugFromPath(pathname: string): string | null {
  const match = pathname.match(/\/direct\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

export function parseDemoStreamInput(raw: string): ParsedDemoStream {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'url', url: DEFAULT_DEMO_STREAM };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const slug = slugFromPath(parsed.pathname);
      if (slug) return { kind: 'slug', slug };
    } catch {
      /* keep as URL */
    }
    return { kind: 'url', url: trimmed };
  }

  if (/\.m3u8(\?|#|$)/i.test(trimmed)) {
    return { kind: 'url', url: trimmed };
  }

  const slug = trimmed.replace(/^\/direct\//i, '').replace(/^\//, '').split(/[/?#]/)[0];
  if (!slug) return { kind: 'url', url: DEFAULT_DEMO_STREAM };
  return { kind: 'slug', slug };
}

interface BootstrapPlayback {
  streamUrl?: string | null;
  muxPlaybackId?: string | null;
  sport?: string;
  title?: string;
  page?: { sport?: string };
  stream?: { url?: string | null; muxPlaybackId?: string | null };
}

function pickSrc(data: BootstrapPlayback): string | null {
  if (data.streamUrl) return data.streamUrl;
  if (data.stream?.url) return data.stream.url;
  const muxId = data.muxPlaybackId ?? data.stream?.muxPlaybackId;
  if (muxId) return `https://stream.mux.com/${muxId}.m3u8`;
  return null;
}

export interface LoadedDemoPlayback {
  src: string;
  sportId?: string;
  title?: string;
}

export async function loadDemoPlayback(
  raw: string,
  fetchFn: typeof fetch = fetch
): Promise<LoadedDemoPlayback> {
  const parsed = parseDemoStreamInput(raw);
  if (parsed.kind === 'url') return { src: parsed.url };

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
  const res = await fetchFn(`${apiBase}/api/direct/${encodeURIComponent(parsed.slug)}/bootstrap`);
  if (res.ok) {
    const data = (await res.json()) as BootstrapPlayback;
    const src = pickSrc(data);
    if (src) {
      return {
        src,
        sportId: data.page?.sport ?? data.sport,
        title: data.title,
      };
    }
  }

  return { src: `https://stream.mux.com/${parsed.slug}.m3u8` };
}
