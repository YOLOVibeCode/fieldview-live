'use client';

/**
 * /demo/multi-channel
 *
 * Two viewer instances of the same stream on one screen.
 * Changes on Channel A (sport, clock, report) appear on Channel B, and vice versa.
 */

import { useRef } from 'react';
import { SportOverlayViewer } from '@/components/demo/SportOverlayViewer';
import { DemoStreamRoom } from '@/lib/demo/DemoStreamRoom';
import { useDemoStreamRoom } from '@/hooks/useDemoStreamRoom';

function SharedActionBanner({ room }: { room: DemoStreamRoom }) {
  const stream = useDemoStreamRoom(room, 'banner');
  return (
    <p
      data-testid="shared-last-action"
      className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
    >
      {stream.lastAction ?? 'Waiting for a change on either channel…'}
    </p>
  );
}

export default function MultiChannelDemoPage() {
  const roomRef = useRef<DemoStreamRoom | null>(null);
  if (!roomRef.current) roomRef.current = new DemoStreamRoom();
  const room = roomRef.current;

  return (
    <div className="min-h-screen bg-gray-950 p-4 flex flex-col gap-4" data-testid="multi-channel-poc">
      <header className="flex flex-col gap-2">
        <h1 className="text-white text-xl font-semibold">Multi-channel overlay PoC</h1>
        <p className="text-sm text-white/50">
          Each panel is its own viewer on the same film. Report or start the clock on one side —
          the other side should update immediately.
        </p>
        <SharedActionBanner room={room} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <section className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-3">
          <SportOverlayViewer
            room={room}
            viewerId="channel-a"
            label="Channel A"
            panelTestId="channel-panel-a"
          />
        </section>
        <section className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
          <SportOverlayViewer
            room={room}
            viewerId="channel-b"
            label="Channel B"
            panelTestId="channel-panel-b"
          />
        </section>
      </div>
    </div>
  );
}
