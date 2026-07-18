'use client';

import { useEffect, useRef } from 'react';

/**
 * Shared Traklet widget — one service-account token, testers identify
 * themselves via the in-widget onboarding (name / email) so issues and
 * test results are attributed to the right person.
 *
 * Loads when NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN is present (GitHub adapter).
 * Falls back to localStorage-only mode when the token is absent.
 */
export function TrakletWidget() {
  const instanceRef = useRef<{ destroy(): void } | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    let cancelled = false;

    const token = process.env.NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN;

    import('traklet')
      .then(async ({ Traklet }) => {
        if (cancelled) return;

        const inst = await Traklet.init({
          adapter: token ? 'github' : 'localStorage',
          ...(token ? { token } : {}),
          projects: [
            {
              id: 'fieldview-live',
              name: 'FieldView.Live',
              identifier: 'YOLOVibeCode/fieldview-live',
            },
          ],
          position: 'top-right',
        });

        if (cancelled) {
          inst.destroy();
        } else {
          instanceRef.current = inst;
          if (!token) {
            console.warn(
              '[Traklet] NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN is not set. ' +
              'Widget is running in local-only mode — issues will not sync to GitHub.',
            );
          }
        }
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
