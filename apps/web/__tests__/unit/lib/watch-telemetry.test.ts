import { describe, it, expect } from 'vitest';
import { createWatchTelemetry } from '@/lib/watch-telemetry';

describe('watch-telemetry', () => {
  it('tracks startup latency and watch time across play/pause', () => {
    const t0 = 1000;
    const telemetry = createWatchTelemetry(t0);

    telemetry.onPlay(1500);
    telemetry.onPause(2500);

    const end = telemetry.buildEndSessionRequest(3000);
    expect(end.startupLatencyMs).toBe(500);
    expect(end.totalWatchMs).toBe(1000);
    expect(end.fatalErrors).toBe(0);
  });

  it('tracks buffering duration', () => {
    const telemetry = createWatchTelemetry(1000);
    telemetry.onBufferStart(2000);
    telemetry.onBufferEnd(2600);

    const end = telemetry.buildEndSessionRequest(3000);
    expect(end.totalBufferMs).toBe(600);
    expect(end.bufferEvents).toBe(1);
  });
});


