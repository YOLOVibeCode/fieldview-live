'use client';

/**
 * Demo page for E2E testing seek overlay and Go Live button.
 * Renders VidstackPlayer with a test stream so Playwright can exercise the seek overlay.
 */

import { VidstackPlayer } from '@/components/v2/video/VidstackPlayer';

const TEST_STREAM =
  'https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU.m3u8';

export default function SeekProtectionDemoPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <h1 className="mb-4 text-xl font-semibold text-white">
        Seek overlay demo (E2E target)
      </h1>
      <div className="max-w-4xl">
        <VidstackPlayer
          src={TEST_STREAM}
          autoPlay
          muted
          data-testid="vidstack-player"
        />
      </div>
    </div>
  );
}
