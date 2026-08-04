'use client';

import { useEffect } from 'react';
import { HOST_RULES } from '@/env-chrome.config';
import { applyEnvChrome, envFromHost, type AppEnv } from './chrome';

/**
 * Mount once in `app/layout.tsx`. Renders no DOM itself — it applies the
 * banner/title/favicon chrome via DOM mutation on mount.
 *
 * `env` is the server-authoritative value (from `resolveServerEnv()`). We also
 * do an instant hostname guess before hydration for zero-flicker first paint,
 * then reconcile if the server disagrees. `HOST_RULES` is imported directly
 * here (client side) — it contains `RegExp`s, which can't be serialized across
 * the Server→Client boundary, so it must NOT be passed as a prop.
 */
export function EnvChrome({ env }: { env: AppEnv }) {
  useEffect(() => {
    const instant = envFromHost(location.hostname, HOST_RULES);
    applyEnvChrome(instant);
    if (env !== instant) applyEnvChrome(env);
  }, [env]);

  return null;
}
