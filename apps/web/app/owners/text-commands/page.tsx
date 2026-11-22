'use client';

/**
 * Owner portal: Text commands.
 *
 * An owner links one mobile phone to the account so they can run game day by text. The link
 * is proven by a text from that phone: the page shows a code once, the owner texts it to the
 * FieldView number, and the page watches for the link to appear.
 *
 * The code lives in memory only. It is never put in browser storage, and after a reload the
 * page says so instead of showing it again.
 */

import {
  buildOwnerCommandsConsentPlain,
  isIanaTimeZone,
  type CoachTextHistoryItem,
  type CoachTextLinkStarted,
  type CoachTextStatus,
} from '@fieldview/data-model';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { apiClient } from '@/lib/api-client';
import { formatPhoneForDisplay } from '@/lib/phone';

type View = 'off' | 'not_linked' | 'waiting' | 'linked' | 'paused' | 'expired';

/** A link code as the API returned it, with the number the owner typed. Kept in memory only. */
interface StartedLink extends CoachTextLinkStarted {
  phone: string;
}

interface UiState {
  /** The owner asked for the link form (Start over, Link again), whatever the stored state is. */
  showForm: boolean;
  notice: 'linked' | 'code_expired' | null;
}

const NO_UI: UiState = { showForm: false, notice: null };

/** How often the page asks whether the text has arrived. */
const POLL_MS = 3_000;
const TICK_MS = 1_000;

const VIEW_LABELS: Record<View, string> = {
  off: 'Not turned on',
  not_linked: 'Not linked',
  waiting: 'Step 2 of 2',
  linked: 'Linked',
  paused: 'Paused',
  expired: 'Expired',
};

const TIME_ZONES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'America/New_York', label: 'Eastern - New York' },
  { value: 'America/Chicago', label: 'Central - Chicago' },
  { value: 'America/Denver', label: 'Mountain - Denver' },
  { value: 'America/Phoenix', label: 'Arizona - Phoenix' },
  { value: 'America/Los_Angeles', label: 'Pacific - Los Angeles' },
  { value: 'America/Anchorage', label: 'Alaska - Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii - Honolulu' },
  { value: 'America/Halifax', label: 'Atlantic - Halifax' },
  { value: 'America/St_Johns', label: "Newfoundland - St. John's" },
];

/** What came of a text, in words. A status this page does not know is shown as it is. */
const OUTCOME_LABELS = new Map<string, string>([
  ['done', 'Done'],
  ['received', 'Received'],
  ['asked', 'Asked'],
  ['no_change', 'No change'],
  ['not_understood', 'Not understood'],
  ['rejected', 'Not accepted'],
  ['failed', 'Failed'],
  ['timeout', 'Timed out'],
]);

const DAY: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };
const DAY_AND_TIME: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

const PILL = 'inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium';
const NOTICE_AMBER = 'rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900 text-sm';
const NOTICE_GREEN = 'rounded-lg bg-green-50 border border-green-200 p-3 text-green-800 text-sm';
const ERROR_LINE = 'text-sm text-destructive';

function getOwnerToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('owner_token');
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function viewOf(status: CoachTextStatus, showForm: boolean): View {
  if (!status.enabled) return 'off';
  if (showForm) return 'not_linked';
  switch (status.state) {
    case 'pending':
      return 'waiting';
    case 'linked':
      return 'linked';
    case 'paused':
      return 'paused';
    case 'expired':
      return 'expired';
    default:
      return 'not_linked';
  }
}

/** The time zone this browser is in, when it says so and FieldView can use the name. */
function readBrowserTimeZone(): string | null {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isIanaTimeZone(zone) ? zone : null;
  } catch {
    return null;
  }
}

/** The common US and Canadian zones, plus the selected one when it is not among them. */
function zoneOptions(selected: string): Array<{ value: string; label: string }> {
  if (!selected || TIME_ZONES.some((zone) => zone.value === selected)) {
    return [...TIME_ZONES];
  }
  return [...TIME_ZONES, { value: selected, label: selected.replace(/_/g, ' ') }];
}

function formatWhen(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(when);
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(when);
  }
}

function formatCountdown(msLeft: number): string {
  const seconds = Math.max(0, Math.ceil(msLeft / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function outcomeLabel(status: string): string {
  return OUTCOME_LABELS.get(status) ?? status.replace(/_/g, ' ');
}

interface TimeZoneFieldProps {
  value: string;
  onChange: (zone: string) => void;
  disabled: boolean;
  busy?: boolean;
  error?: string | null;
}

function TimeZoneField({
  value,
  onChange,
  disabled,
  busy = false,
  error = null,
}: TimeZoneFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="text-commands-timezone" className="text-sm font-medium">
        Time zone
      </label>
      <select
        id="text-commands-timezone"
        name="timeZone"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-describedby="text-commands-timezone-help"
        data-loading={busy ? 'true' : 'false'}
        className="w-full h-11 sm:h-12 rounded-md border bg-background px-3 py-2 text-base"
        data-testid="select-text-commands-timezone"
      >
        {zoneOptions(value).map((zone) => (
          <option key={zone.value} value={zone.value}>
            {zone.label}
          </option>
        ))}
      </select>
      <p id="text-commands-timezone-help" className="text-xs text-muted-foreground">
        Times are shown and read in this time zone.
      </p>
      {error && (
        <p role="alert" data-testid="error-text-commands-timezone" className={ERROR_LINE}>
          {error}
        </p>
      )}
    </div>
  );
}

interface LinkFormProps {
  phone: string;
  onPhoneChange: (value: string) => void;
  zone: string;
  onZoneChange: (zone: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function LinkForm({
  phone,
  onPhoneChange,
  zone,
  onZoneChange,
  busy,
  error,
  onSubmit,
}: LinkFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="form-text-commands-link">
      <div className="space-y-1">
        <label htmlFor="text-commands-phone" className="text-sm font-medium">
          Mobile number
        </label>
        <Input
          id="text-commands-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
          placeholder="(214) 555-0100"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          aria-describedby="text-commands-phone-help"
          required
          disabled={busy}
          data-testid="input-text-commands-phone"
        />
        <p id="text-commands-phone-help" className="text-xs text-muted-foreground">
          The phone you will text from. US and Canadian numbers only.
        </p>
      </div>

      <TimeZoneField value={zone} onChange={onZoneChange} disabled={busy} />

      <p
        data-testid="consent-text-commands"
        className="text-xs sm:text-sm leading-relaxed text-muted-foreground"
      >
        {buildOwnerCommandsConsentPlain()}{' '}
        <Link
          href="/terms#sms"
          className="underline underline-offset-2"
          data-testid="link-text-commands-terms"
        >
          Terms
        </Link>
        {' · '}
        <Link
          href="/privacy"
          className="underline underline-offset-2"
          data-testid="link-text-commands-privacy"
        >
          Privacy
        </Link>
      </p>

      {error && (
        <p role="alert" data-testid="error-text-commands-link" className={ERROR_LINE}>
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy}
        data-loading={busy ? 'true' : 'false'}
        data-testid="btn-text-commands-get-code"
      >
        {busy ? 'Working…' : 'Get my code'}
      </Button>
    </form>
  );
}

interface WaitingForTextProps {
  status: CoachTextStatus;
  started: StartedLink | null;
  codeExpired: boolean;
  countdown: string | null;
  onStartOver: () => void;
}

function WaitingForText({
  status,
  started,
  codeExpired,
  countdown,
  onStartOver,
}: WaitingForTextProps) {
  return (
    <div className="space-y-4">
      {codeExpired ? (
        <p data-testid="text-commands-code-expired" role="status" className={NOTICE_AMBER}>
          That code has expired.
        </p>
      ) : (
        <>
          {started ? (
            <div className="space-y-2">
              <p className="text-sm" data-testid="text-commands-from">
                From {formatPhoneForDisplay(started.phone)}, text this:
              </p>
              <p
                className="text-3xl sm:text-4xl font-mono font-semibold tracking-wider select-all"
                data-testid="text-commands-code"
              >
                LINK {started.code}
              </p>
              <p className="text-sm" data-testid="text-commands-to">
                to {formatPhoneForDisplay(started.productNumber)}
              </p>
              {started.smsHref.startsWith('sms:') && (
                <Button asChild data-testid="btn-text-commands-open-messages">
                  <a href={started.smsHref}>Open my messages</a>
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm" data-testid="text-commands-code-hidden">
              FieldView is waiting for a text from {status.pendingPhoneMasked ?? 'your phone'}. The
              code is shown only once, so it is not on this page any more. If you do not have it,
              start over to get a new one.
            </p>
          )}

          <p
            role="status"
            data-testid="text-commands-waiting"
            className="text-sm text-muted-foreground"
          >
            Waiting for your text{'…'}
          </p>

          {countdown && (
            <p data-testid="text-commands-countdown" className="text-sm text-muted-foreground">
              Code expires in {countdown}
            </p>
          )}

          {status.unverifiedTextSeen && (
            <div
              data-testid="notice-text-commands-unverified"
              role="status"
              className={NOTICE_AMBER}
            >
              A text arrived but could not be verified. Send it again.
            </div>
          )}
        </>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onStartOver}
        data-testid="btn-text-commands-start-over"
      >
        Start over
      </Button>
    </div>
  );
}

function PhoneFacts({ status }: { status: CoachTextStatus }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Phone</dt>
      <dd data-testid="text-commands-phone">{status.phoneMasked ?? 'Unknown'}</dd>
      {status.verifiedAt && (
        <>
          <dt className="text-muted-foreground">Linked</dt>
          <dd data-testid="text-commands-linked-at">
            {formatWhen(status.verifiedAt, status.timeZone, DAY)}
          </dd>
        </>
      )}
      {status.lastCommandAt && (
        <>
          <dt className="text-muted-foreground">Last text</dt>
          <dd data-testid="text-commands-last-text">
            {formatWhen(status.lastCommandAt, status.timeZone, DAY_AND_TIME)}
          </dd>
        </>
      )}
    </dl>
  );
}

function CommandList({ status }: { status: CoachTextStatus }) {
  return (
    <section aria-labelledby="text-commands-commands-heading" className="space-y-2">
      <h4 id="text-commands-commands-heading" className="text-sm font-semibold">
        Commands
      </h4>
      <p className="text-sm" data-testid="text-commands-number">
        Text {formatPhoneForDisplay(status.productNumber)}:
      </p>
      {status.commands.length === 0 ? (
        <p data-testid="text-commands-commands-soon" className="text-sm text-muted-foreground">
          Commands arrive with the next update.
        </p>
      ) : (
        <ul data-testid="list-text-commands-commands" className="space-y-1 text-sm">
          {status.commands.map((command) => (
            <li key={command.word} className="flex gap-3">
              <span className="font-mono font-semibold">{command.word}</span>
              <span className="text-muted-foreground">{command.description}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface RecentTextsProps {
  /** Null while the texts are loading. */
  items: CoachTextHistoryItem[] | null;
  failed: boolean;
  timeZone: string;
}

function RecentTexts({ items, failed, timeZone }: RecentTextsProps) {
  return (
    <section
      aria-labelledby="text-commands-history-heading"
      className="space-y-2"
      data-loading={items === null && !failed ? 'true' : 'false'}
      data-testid="section-text-commands-history"
    >
      <h4 id="text-commands-history-heading" className="text-sm font-semibold">
        Recent texts
      </h4>
      {failed ? (
        <p role="alert" data-testid="error-text-commands-history" className={ERROR_LINE}>
          Recent texts could not be loaded.
        </p>
      ) : items === null ? (
        <p data-testid="loading-text-commands-history" className="text-sm text-muted-foreground">
          Loading recent texts{'…'}
        </p>
      ) : items.length === 0 ? (
        <p data-testid="empty-text-commands-history" className="text-sm text-muted-foreground">
          No texts yet.
        </p>
      ) : (
        <ul data-testid="list-text-commands-history" className="divide-y rounded-lg border text-sm">
          {items.map((item, index) => (
            <li
              key={`${item.createdAt}-${index}`}
              data-testid="row-text-commands-history"
              className="p-3 space-y-1"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {formatWhen(item.createdAt, timeZone, DAY_AND_TIME)}
                </span>
                <span data-status={item.status} className={PILL}>
                  {outcomeLabel(item.status)}
                </span>
              </div>
              <p className="font-mono break-words">{item.body}</p>
              {item.replyText && (
                <p className="text-muted-foreground break-words">{item.replyText}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface UnlinkControlProps {
  confirming: boolean;
  busy: boolean;
  error: string | null;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Unlinking takes two steps, so one stray tap cannot cut a phone off on game day. */
function UnlinkControl({
  confirming,
  busy,
  error,
  onAsk,
  onConfirm,
  onCancel,
}: UnlinkControlProps) {
  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onAsk}
        data-testid="btn-text-commands-unlink"
      >
        Unlink this phone
      </Button>
    );
  }
  return (
    <div
      data-testid="confirm-text-commands-unlink"
      role="group"
      aria-label="Unlink this phone"
      className="rounded-lg border p-3 space-y-2"
    >
      <p className="text-sm">
        Unlink this phone? Texts from it will stop working until a phone is linked again.
      </p>
      {error && (
        <p role="alert" data-testid="error-text-commands-unlink" className={ERROR_LINE}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy}
          data-loading={busy ? 'true' : 'false'}
          onClick={onConfirm}
          data-testid="btn-text-commands-unlink-confirm"
        >
          {busy ? 'Working…' : 'Unlink now'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onCancel}
          data-testid="btn-text-commands-unlink-cancel"
        >
          Keep it
        </Button>
      </div>
    </div>
  );
}

export default function OwnerTextCommandsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [status, setStatus] = useState<CoachTextStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Linking a phone.
  const [started, setStarted] = useState<StartedLink | null>(null);
  const [ui, setUi] = useState<UiState>(NO_UI);
  const [now, setNow] = useState(() => Date.now());
  const [phone, setPhone] = useState('');
  const [browserZone] = useState<string | null>(readBrowserTimeZone);
  const [chosenZone, setChosenZone] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // A linked phone.
  const [pendingZone, setPendingZone] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [history, setHistory] = useState<CoachTextHistoryItem[] | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  /** One status check at a time. */
  const pollInFlight = useRef(false);
  /** Goes up whenever the page learns something newer than a check that is still out. */
  const generation = useRef(0);

  const loadStatus = useCallback(async () => {
    const token = getOwnerToken();
    if (!token) return;
    generation.current += 1;
    setLoading(true);
    setError(null);
    try {
      const next = await apiClient.ownerTextCommands(token);
      setStatus(next);
      setNow(Date.now());
    } catch (e) {
      setError(messageOf(e, 'Could not load text commands.'));
    } finally {
      setLoading(false);
    }
  }, []);

  /** Asks once whether the text has arrived. A failed check is left to the next one. */
  const poll = useCallback(async () => {
    const token = getOwnerToken();
    if (!token || pollInFlight.current) return;
    pollInFlight.current = true;
    const asked = generation.current;
    try {
      const next = await apiClient.ownerTextCommands(token);
      if (asked !== generation.current) return;
      if (next.state !== 'pending') {
        setStarted(null);
        setUi((current) => {
          if (next.state === 'linked') return { showForm: false, notice: 'linked' };
          // An owner who already chose to start over does not need to hear the old code ran out.
          return current.showForm ? current : { showForm: false, notice: 'code_expired' };
        });
      }
      setStatus(next);
    } catch {
      // Nothing to show: the next check is three seconds away.
    } finally {
      pollInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('owner_token');
    const expires = localStorage.getItem('owner_token_expires');
    if (!token || (expires && new Date(expires) < new Date())) {
      router.replace('/owners/login');
      return;
    }
    setAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (authenticated) void loadStatus();
  }, [authenticated, loadStatus]);

  const view = status ? viewOf(status, ui.showForm) : null;
  const codeExpiresAtMs = status?.codeExpiresAt ? Date.parse(status.codeExpiresAt) : Number.NaN;
  const codeExpired = Number.isFinite(codeExpiresAtMs) && now >= codeExpiresAtMs;
  const countdown =
    Number.isFinite(codeExpiresAtMs) && !codeExpired
      ? formatCountdown(codeExpiresAtMs - now)
      : null;
  // The old code stays live while the owner looks at the form again, so the watch goes on.
  const watching = status?.enabled === true && status.state === 'pending' && !codeExpired;
  const isLinked = view === 'linked';

  // While a code is live: count it down every second and check for the text every three.
  useEffect(() => {
    if (!watching) return undefined;
    const tick = setInterval(() => {
      const at = Date.now();
      setNow(at);
      // The watch ends here. A phone's browser sleeps while its owner is away sending the
      // text, so ask one last time before saying the code ran out.
      if (at >= codeExpiresAtMs) void poll();
    }, TICK_MS);
    const check = setInterval(() => void poll(), POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(check);
    };
  }, [watching, poll, codeExpiresAtMs]);

  // The recent texts, each time the page comes to show a linked phone.
  useEffect(() => {
    if (!isLinked) return undefined;
    const token = getOwnerToken();
    if (!token) return undefined;
    let cancelled = false;
    setHistory(null);
    setHistoryFailed(false);
    apiClient
      .ownerTextCommandsHistory(token)
      .then((result) => {
        if (!cancelled) setHistory(result.items);
      })
      .catch(() => {
        if (!cancelled) setHistoryFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLinked]);

  function logout() {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_token_expires');
    router.push('/owners/login');
  }

  /** The zone the link form starts on: the owner's pick, else the browser's, else the account's. */
  function linkZoneOf(current: CoachTextStatus): string {
    return chosenZone ?? browserZone ?? current.timeZone;
  }

  async function handleStartLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (linkBusy || !status) return;
    const token = getOwnerToken();
    if (!token) return;
    const trimmed = phone.trim();
    if (!trimmed) {
      setLinkError('Enter your mobile number.');
      return;
    }
    setLinkBusy(true);
    setLinkError(null);
    try {
      const result = await apiClient.ownerTextCommandsStartLink(token, {
        phone: trimmed,
        timeZone: linkZoneOf(status),
      });
      // A check that is still out was asked before this code existed.
      generation.current += 1;
      setStarted({ ...result, phone: trimmed });
      setStatus((current) =>
        current
          ? {
              ...current,
              state: 'pending',
              codeExpiresAt: result.codeExpiresAt,
              pendingPhoneMasked: null,
              unverifiedTextSeen: false,
            }
          : current
      );
      setUi(NO_UI);
      setNow(Date.now());
    } catch (e) {
      setLinkError(messageOf(e, 'Could not get a code. Try again.'));
    } finally {
      setLinkBusy(false);
    }
  }

  /** Back to the form. Nothing is unlinked: a new code simply replaces the old one. */
  function showLinkForm() {
    setStarted(null);
    setLinkError(null);
    setUi({ showForm: true, notice: null });
  }

  async function handleZoneChange(zone: string) {
    const token = getOwnerToken();
    if (!token || !status || pendingZone !== null || zone === status.timeZone) return;
    setPendingZone(zone);
    setZoneError(null);
    try {
      setStatus(await apiClient.ownerTextCommandsSetTimeZone(token, zone));
    } catch (e) {
      setZoneError(messageOf(e, 'Could not save the time zone.'));
    } finally {
      setPendingZone(null);
    }
  }

  async function handleUnlink() {
    const token = getOwnerToken();
    if (!token || unlinkBusy) return;
    setUnlinkBusy(true);
    setUnlinkError(null);
    try {
      await apiClient.ownerTextCommandsUnlink(token);
    } catch (e) {
      setUnlinkError(messageOf(e, 'Could not unlink this phone. Try again.'));
      setUnlinkBusy(false);
      return;
    }
    setUnlinkBusy(false);
    setConfirmingUnlink(false);
    setStarted(null);
    setUi(NO_UI);
    setPhone('');
    setHistory(null);
    setHistoryFailed(false);
    setStatus(null);
    await loadStatus();
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading{'…'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Text commands</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Link your phone, then run game day by text
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/owners/dashboard')}
                data-testid="link-dashboard"
              >
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={logout}
                aria-label="Sign out"
                className="shrink-0"
                data-testid="btn-logout"
              >
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">{'✕'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {error && (
          <ErrorBanner
            message={error}
            onDismiss={() => setError(null)}
            onRetry={() => void loadStatus()}
            data-testid="text-commands-error"
          />
        )}

        {loading ? (
          <div className="text-center py-12" data-testid="loading-text-commands">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading text commands{'…'}</p>
          </div>
        ) : status && view ? (
          <Card data-testid="panel-text-commands">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Text commands</CardTitle>
                <span data-testid="status-text-commands" data-state={view} className={PILL}>
                  {VIEW_LABELS[view]}
                </span>
              </div>
              {(view === 'off' || view === 'not_linked') && (
                <CardDescription>
                  Run game day from your phone. Text FieldView to put your live camera stream on a
                  game page.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {ui.notice === 'code_expired' && view !== 'off' && view !== 'waiting' && (
                <div
                  data-testid="notice-text-commands-code-expired"
                  role="status"
                  className={NOTICE_AMBER}
                >
                  That code has expired. Get a new one.
                </div>
              )}

              {view === 'off' && (
                <p data-testid="text-commands-off" className="text-sm">
                  Text commands are not turned on for this account yet.
                </p>
              )}

              {view === 'not_linked' && (
                <LinkForm
                  phone={phone}
                  onPhoneChange={setPhone}
                  zone={linkZoneOf(status)}
                  onZoneChange={setChosenZone}
                  busy={linkBusy}
                  error={linkError}
                  onSubmit={(event) => void handleStartLink(event)}
                />
              )}

              {view === 'waiting' && (
                <WaitingForText
                  status={status}
                  started={started}
                  codeExpired={codeExpired}
                  countdown={countdown}
                  onStartOver={showLinkForm}
                />
              )}

              {view === 'linked' && (
                <>
                  {ui.notice === 'linked' && (
                    <div
                      data-testid="notice-text-commands-linked"
                      role="status"
                      className={NOTICE_GREEN}
                    >
                      Your phone is linked.
                    </div>
                  )}
                  <PhoneFacts status={status} />
                  <TimeZoneField
                    value={pendingZone ?? status.timeZone}
                    onChange={(zone) => void handleZoneChange(zone)}
                    disabled={pendingZone !== null}
                    busy={pendingZone !== null}
                    error={zoneError}
                  />
                  <CommandList status={status} />
                  <RecentTexts items={history} failed={historyFailed} timeZone={status.timeZone} />
                </>
              )}

              {view === 'paused' && (
                <>
                  <div data-testid="text-commands-paused" className={`${NOTICE_AMBER} space-y-1`}>
                    <p>
                      This phone texted STOP, so commands are paused and FieldView cannot reply.
                    </p>
                    <p>
                      Text START to {formatPhoneForDisplay(status.productNumber)} to turn it back
                      on.
                    </p>
                  </div>
                  <PhoneFacts status={status} />
                </>
              )}

              {view === 'expired' && (
                <>
                  <p data-testid="text-commands-expired" className="text-sm">
                    This phone has not texted in a long time, so its link was turned off. Link it
                    again to keep using it.
                  </p>
                  <PhoneFacts status={status} />
                  <div>
                    <Button
                      type="button"
                      onClick={showLinkForm}
                      data-testid="btn-text-commands-link-again"
                    >
                      Link again
                    </Button>
                  </div>
                </>
              )}

              {(view === 'linked' || view === 'paused' || view === 'expired') && (
                <UnlinkControl
                  confirming={confirmingUnlink}
                  busy={unlinkBusy}
                  error={unlinkError}
                  onAsk={() => setConfirmingUnlink(true)}
                  onConfirm={() => void handleUnlink()}
                  onCancel={() => {
                    setConfirmingUnlink(false);
                    setUnlinkError(null);
                  }}
                />
              )}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
