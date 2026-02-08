'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

interface UseViewerCountOptions {
  slug: string | null;
  enabled?: boolean;
  pollInterval?: number;
}

export function useViewerCount({
  slug,
  enabled = true,
  pollInterval = 15000,
}: UseViewerCountOptions) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!slug || !enabled) return;
    try {
      const response = await fetch(
        `${API_URL}/api/direct/${encodeURIComponent(slug)}/viewer-count`
      );
      if (response.ok) {
        const data = await response.json();
        setCount(data.count ?? 0);
      }
    } catch {
      // Silently fail — viewer count is non-critical
    }
  }, [slug, enabled]);

  useEffect(() => {
    if (!slug || !enabled) return;
    fetchCount();
    const interval = setInterval(fetchCount, pollInterval);
    return () => clearInterval(interval);
  }, [fetchCount, pollInterval, slug, enabled]);

  return { count };
}
