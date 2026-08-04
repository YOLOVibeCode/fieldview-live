'use client';

import { useEffect, useRef } from 'react';

/**
 * Traklet issue/test widget — DEV/UAT only.
 *
 * Initializes ONLY when `NEXT_PUBLIC_TRAKLET_ENABLED === 'true'` AND a GitHub
 * token is present. Both are set on dev/uat builds and absent on production, so
 * neither the widget nor the (client-exposed) PAT ever ship to prod. Issues file
 * to the single repo `YOLOVibeCode/fieldview-live`; a GitHub Action tags each
 * with an `env:dev` / `env:uat` label based on the reporting URL.
 */
export function TrakletWidget() {
  const instanceRef = useRef<{ destroy(): void } | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN;
    const enabled = process.env.NEXT_PUBLIC_TRAKLET_ENABLED === 'true';
    if (!enabled || !token) return; // off in production (flag unset, token absent)
    if (initRef.current) return;
    initRef.current = true;
    let cancelled = false;

    import('traklet')
      .then(async ({ Traklet }) => {
        if (cancelled) return;
        const inst = await Traklet.init({
          adapter: 'github',
          token,
          projects: [
            {
              id: 'fieldview-live',
              name: 'FieldView.Live',
              identifier: 'YOLOVibeCode/fieldview-live',
            },
          ],
          position: 'top-right',
        });
        if (cancelled) inst.destroy();
        else instanceRef.current = inst;
      })
      .catch((err: unknown) => {
        console.warn('[Traklet] Failed to initialize:', err);
      });

    return () => {
      cancelled = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
      initRef.current = false;
    };
  }, []);

  return null;
}
