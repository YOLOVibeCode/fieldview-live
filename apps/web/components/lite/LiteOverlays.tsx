/**
 * LiteOverlays
 *
 * Lean overlay components for the Lite viewer. Each is an absolutely-positioned
 * child of the LiteViewer wrapper, so they all stay visible in fullscreen
 * (real or fake). Intentionally minimal — they consume the same data hooks as
 * the full viewer but render thin, fully-controlled markup.
 */

'use client';

import { useState } from 'react';
import type { TeamData } from '@/components/v2/scoreboard/Scoreboard';
import type { ChatMessageData } from '@/components/v2/chat/ChatMessageList';
import type { LiteStreamStatus } from './LiteVideoPlayer';

/* ----------------------------- Scoreboard ------------------------------ */

export interface LiteScoreboardOverlayProps {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
}

export function LiteScoreboardOverlay({
  homeTeam,
  awayTeam,
  period,
  time,
}: LiteScoreboardOverlayProps) {
  return (
    <div
      data-testid="lite-scoreboard"
      className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2"
    >
      <div className="flex items-center gap-3 rounded-lg bg-black/70 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
        <Team team={homeTeam} testid="lite-score-home" />
        <div className="flex flex-col items-center px-1 text-[10px] uppercase tracking-wide text-white/70">
          {period && <span data-testid="lite-period">{period}</span>}
          {time && <span data-testid="lite-clock">{time}</span>}
        </div>
        <Team team={awayTeam} testid="lite-score-away" align="right" />
      </div>
    </div>
  );
}

function Team({
  team,
  testid,
  align = 'left',
}: {
  team: TeamData;
  testid: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: team.color }}
        aria-hidden
      />
      <span className="max-w-[6rem] truncate text-sm font-semibold">{team.name}</span>
      <span data-testid={testid} className="text-lg font-bold tabular-nums">
        {team.score}
      </span>
    </div>
  );
}

/* ----------------------------- Viewer count ----------------------------- */

export function LiteViewerCountBadge({ count }: { count: number }) {
  return (
    <div
      data-testid="lite-viewer-count"
      className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
    >
      <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
      {count} watching
    </div>
  );
}

/* -------------------------------- Chat ---------------------------------- */

export interface LiteChatOverlayProps {
  messages: ChatMessageData[];
  onSend: (text: string) => Promise<void>;
  connected: boolean;
}

export function LiteChatOverlay({ messages, onSend, connected }: LiteChatOverlayProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
    } catch {
      /* surfaced via connection state; keep text for retry */
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      data-testid="lite-chat"
      className="pointer-events-auto absolute bottom-3 left-3 z-20 flex w-[min(20rem,70vw)] flex-col gap-2"
    >
      <div
        data-testid="lite-chat-messages"
        className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg bg-black/50 p-2 backdrop-blur-sm"
      >
        {messages.slice(-30).map((m) => (
          <div key={m.id} className="text-xs leading-snug text-white">
            <span className="font-semibold" style={{ color: m.userColor }}>
              {m.userName}:
            </span>{' '}
            <span className="text-white/90">{m.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-1.5">
        <input
          data-testid="lite-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={240}
          placeholder={connected ? 'Say something…' : 'Connecting…'}
          disabled={!connected || sending}
          className="flex-1 rounded-md border border-white/20 bg-black/60 px-2 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <button
          type="submit"
          data-testid="lite-chat-send"
          disabled={!connected || sending || !text.trim()}
          className="rounded-md bg-white/15 px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

/* ------------------------------ Controls -------------------------------- */

export interface LiteControlsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export function LiteControls({
  isFullscreen,
  onToggleFullscreen,
  muted,
  onToggleMute,
}: LiteControlsProps) {
  return (
    <div
      data-testid="lite-controls"
      className="pointer-events-auto absolute bottom-3 right-3 z-30 flex items-center gap-2"
    >
      <button
        type="button"
        data-testid="lite-btn-mute"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="rounded-md bg-black/70 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/80"
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <button
        type="button"
        data-testid="lite-btn-fullscreen"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        className="rounded-md bg-black/70 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/80"
      >
        {isFullscreen ? '⤡ Exit' : '⤢ Fullscreen'}
      </button>
    </div>
  );
}

/* ------------------------------- Status --------------------------------- */

export function LiteStatusOverlay({ status }: { status: LiteStreamStatus }) {
  if (status === 'playing') return null;

  const label =
    status === 'loading'
      ? 'Loading stream…'
      : status === 'offline'
      ? 'Stream is offline'
      : 'Playback error';

  return (
    <div
      data-testid="lite-status"
      data-status={status}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60"
    >
      <div className="rounded-lg bg-black/70 px-4 py-2 text-sm font-medium text-white">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------- Paywall -------------------------------- */

export interface LitePaywallGateProps {
  priceInCents: number;
  message?: string | null;
  onUnlock: () => void;
}

export function LitePaywallGate({ priceInCents, message, onUnlock }: LitePaywallGateProps) {
  return (
    <div
      data-testid="lite-paywall"
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-6 text-center"
    >
      <div className="max-w-sm space-y-3">
        <h2 className="text-lg font-bold text-white">This stream requires access</h2>
        <p className="text-sm text-white/80">
          {message || `Unlock for $${(priceInCents / 100).toFixed(2)} to watch.`}
        </p>
        <button
          type="button"
          data-testid="lite-paywall-unlock"
          onClick={onUnlock}
          className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-black"
        >
          Get access
        </button>
      </div>
    </div>
  );
}
