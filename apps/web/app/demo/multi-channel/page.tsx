'use client';

/**
 * /demo/multi-channel
 *
 * Two viewer instances of the same stream on one screen.
 * Stream URL, sport, and clock live in the shared toolbar — not per channel.
 */

import { useRef } from 'react';
import { SportOverlayViewer } from '@/components/demo/SportOverlayViewer';
import { MultiChannelToolbar } from '@/components/demo/MultiChannelToolbar';
import { DemoStreamRoom } from '@/lib/demo/DemoStreamRoom';

export default function MultiChannelDemoPage() {
  const roomRef = useRef<DemoStreamRoom | null>(null);
  if (!roomRef.current) roomRef.current = new DemoStreamRoom();
  const room = roomRef.current;

  return (
    <div className="min-h-screen bg-gray-950 p-4 flex flex-col gap-4" data-testid="multi-channel-poc">
      <header className="flex flex-col gap-2">
        <h1 className="text-white text-xl font-semibold">Multi-channel overlay PoC</h1>
        <p className="text-sm text-white/50">
          Load one stream, pick one sport overlay. Each panel is its own viewer — report or
          confirm on one side and the other updates immediately.
        </p>
        <MultiChannelToolbar room={room} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <section className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-3">
          <SportOverlayViewer
            room={room}
            viewerId="channel-a"
            label="Channel A"
            panelTestId="channel-panel-a"
            showProducerControls={false}
            showPlayback
          />
        </section>
        <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
          <SportOverlayViewer
            room={room}
            viewerId="channel-b"
            label="Channel B"
            panelTestId="channel-panel-b"
            showProducerControls={false}
            showPlayback
          />
        </section>
      </div>
    </div>
  );
}
