'use client';

/**
 * /demo/sport-overlay
 *
 * E2E target (no API). Single viewer instance of the overlay PoC.
 */

import { useRef } from 'react';
import { SportOverlayViewer } from '@/components/demo/SportOverlayViewer';
import { DemoStreamRoom } from '@/lib/demo/DemoStreamRoom';

export default function SportOverlayDemoPage() {
  const roomRef = useRef<DemoStreamRoom | null>(null);
  if (!roomRef.current) roomRef.current = new DemoStreamRoom();

  return (
    <div className="min-h-screen bg-gray-900 p-4 flex flex-col gap-4">
      <h1 className="text-white text-xl font-semibold">Sport Overlay PoC (E2E target)</h1>
      <div className="w-full max-w-2xl">
        <SportOverlayViewer
          room={roomRef.current}
          viewerId="demo-viewer"
        />
      </div>
    </div>
  );
}
