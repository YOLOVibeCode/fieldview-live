'use client';

/**
 * Owner portal: Text commands.
 *
 * A login keeps a list of phones that run game day by text: the owner's own and their
 * helpers'. Each phone is proven by a text from it. The owner types the person's name and
 * number, the page shows a code once, that person texts LINK and the code to the FieldView
 * number from that phone, and the page watches for the row to turn to Linked. The text is
 * also that person's opt-in, so a helper needs no login.
 *
 * Codes live in memory only. They are never put in browser storage, and after a reload a
 * waiting row says so instead of showing its code again.
 */

import {
  buildOwnerCommandsConsentPlain,
  isIanaTimeZone,
  type CoachTextHistoryItem,
  type CoachTextPhoneCode,
  type CoachTextPhoneStatus,
  type CoachTextStatus,
} from '@fieldview/data-model';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { ApiError, apiClient } from '@/lib/api-client';
import { formatPhoneForDisplay } from '@/lib/phone';

/** The browser's IANA time zone, when it has a known one. The API keeps it only until one is picked. */
function browserTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isIanaTimeZone(zone) ? zone : undefined;
  } catch {
    return undefined;
  }
}

/** A code as the API returned it, with the name it was asked for. Kept in memory only. */
interface HeldCode extends CoachTextPhoneCode {
  label: string;
  /** How long the code had to run when it arrived, in whole minutes. */
  minutes: number;
}

interface PhonesState {
  status: CoachTextStatus | null;
  /** The codes this browser asked for, by phone id. */
  codes: ReadonlyMap<string, HeldCode>;
  /** Phones whose LINK text arrived while the page was open. */
  linked: ReadonlySet<string>;
  /** Goes up each time a phone is linked, so the recent texts are read again. */
  linkCount: number;
}

type PhonesAction =
  /** The list as the API has it. */
  | { type: 'status'; status: CoachTextStatus }
  /** A code from adding a phone or asking for a new one. */
  | { type: 'code'; code: CoachTextPhoneCode; label: string; minutes: number }
  | { type: 'removed'; id: string }
  | { type: 'timeZone'; timeZone: string };

/** What one row shows. */
type RowView = 'waiting' | 'code_expired' | 'linked' | 'paused' | 'expired';

/** What the owner is doing to one row. */
interface RowUi {
  codeBusy: boolean;
  codeError: string | null;
  confirmingRemove: boolean;
  removeBusy: boolean;
  removeError: string | null;
}

const NO_PHONES: PhonesState = { status: null, codes: new Map(), linked: new Set(), linkCount: 0 };

const IDLE_ROW: RowUi = {
  codeBusy: false,
  codeError: null,
  confirmingRemove: false,
  removeBusy: false,
  removeError: null,
};

/** How often the page asks whether a text has arrived. */
const POLL_MS = 3_000;
const TICK_MS = 1_000;

/** The longest name AddCoachTextPhoneSchema takes. */
const LABEL_MAX = 40;
const PHONE_MAX = 32;

const ROW_LABELS: Record<RowView, string> = {
  waiting: 'Waiting',
  code_expired: 'Code expired',
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

/** The API's reason for turning a request down, such as PHONE_ALREADY_ADDED. */
function reasonOf(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null;
}

function addErrorMessage(error: unknown): string {
  if (reasonOf(error) === 'PHONE_ALREADY_ADDED') return 'This number is already on your list.';
  return messageOf(error, 'Could not get a code. Try again.');
}

function newCodeErrorMessage(error: unknown): string {
  if (reasonOf(error) === 'PHONE_ALREADY_LINKED') return 'This phone is already linked.';
  return messageOf(error, 'Could not get a new code. Try again.');
}

function sameInstant(a: string, b: string): boolean {
  return Date.parse(a) === Date.parse(b);
}

/** Whether a code this browser holds is still the one the phone waits on. */
function stillHeld(phone: CoachTextPhoneStatus | undefined, held: HeldCode): boolean {
  if (!phone || phone.state === 'linked' || phone.state === 'paused') return false;
  // A different time means a newer code, asked for somewhere else, replaced this one.
  if (phone.state === 'pending' && phone.codeExpiresAt !== null) {
    return sameInstant(phone.codeExpiresAt, held.codeExpiresAt);
  }
  return true;
}

function phonesReducer(state: PhonesState, action: PhonesAction): PhonesState {
  switch (action.type) {
    case 'status': {
      const next = action.status;
      const rows = new Map(next.phones.map((phone) => [phone.id, phone]));
      const before = new Map((state.status?.phones ?? []).map((phone) => [phone.id, phone]));
      const codes = new Map<string, HeldCode>();
      state.codes.forEach((held, id) => {
        if (stillHeld(rows.get(id), held)) codes.set(id, held);
      });
      const linked = new Set([...state.linked].filter((id) => rows.get(id)?.state === 'linked'));
      let newlyLinked = 0;
      next.phones.forEach((phone) => {
        if (phone.state === 'linked' && before.get(phone.id)?.state === 'pending') {
          linked.add(phone.id);
          newlyLinked += 1;
        }
      });
      return { status: next, codes, linked, linkCount: state.linkCount + newlyLinked };
    }
    case 'code': {
      const { code, label, minutes } = action;
      const codes = new Map(state.codes).set(code.id, { ...code, label, minutes });
      const linked = new Set(state.linked);
      linked.delete(code.id);
      if (!state.status) return { ...state, codes, linked };
      const waiting = {
        label,
        state: 'pending' as const,
        codeExpiresAt: code.codeExpiresAt,
        unverifiedTextSeen: false,
      };
      const current = state.status.phones;
      // The row is the API's until the list is read again; a new one has no number to show yet.
      const phones = current.some((phone) => phone.id === code.id)
        ? current.map((phone) => (phone.id === code.id ? { ...phone, ...waiting } : phone))
        : [
            ...current,
            { id: code.id, phoneMasked: '', verifiedAt: null, lastCommandAt: null, ...waiting },
          ];
      return { ...state, status: { ...state.status, phones }, codes, linked };
    }
    case 'removed': {
      const codes = new Map(state.codes);
      codes.delete(action.id);
      const linked = new Set(state.linked);
      linked.delete(action.id);
      const status = state.status
        ? {
            ...state.status,
            phones: state.status.phones.filter((phone) => phone.id !== action.id),
          }
        : null;
      return { ...state, status, codes, linked };
    }
    case 'timeZone':
      return state.status
        ? { ...state, status: { ...state.status, timeZone: action.timeZone } }
        : state;
  }
}

/** When the code a phone waits on runs out, or NaN when it waits on none. */
function codeExpiryOf(phone: CoachTextPhoneStatus, held: HeldCode | undefined): number {
  if (phone.state === 'linked' || phone.state === 'paused') return Number.NaN;
  if (held) return Date.parse(held.codeExpiresAt);
  return phone.state === 'pending' && phone.codeExpiresAt
    ? Date.parse(phone.codeExpiresAt)
    : Number.NaN;
}

function isLive(expiresAtMs: number, now: number): boolean {
  return Number.isFinite(expiresAtMs) && now < expiresAtMs;
}

function rowViewOf(phone: CoachTextPhoneStatus, expiresAtMs: number, now: number): RowView {
  switch (phone.state) {
    case 'linked':
      return 'linked';
    case 'paused':
      return 'paused';
    case 'expired':
      return isLive(expiresAtMs, now) ? 'waiting' : 'expired';
    default:
      return isLive(expiresAtMs, now) ? 'waiting' : 'code_expired';
  }
}

/** Whole minutes from `at` until the code runs out. */
function minutesUntil(iso: string, at: number): number {
  const ms = Date.parse(iso) - at;
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 60_000)) : 0;
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

function ConsentLine() {
  return (
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
  );
}

interface AddPhoneFormProps {
  label: string;
  onLabelChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function AddPhoneForm({
  label,
  onLabelChange,
  phone,
  onPhoneChange,
  busy,
  error,
  onSubmit,
}: AddPhoneFormProps) {
  const errorId = error ? ' text-phone-add-error' : '';
  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="text-phones-add-heading"
      className="space-y-4"
      data-testid="form-add-phone"
    >
      <h4 id="text-phones-add-heading" className="text-sm font-semibold">
        Add a phone
      </h4>

      <div className="space-y-1">
        <label htmlFor="text-phone-label" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="text-phone-label"
          name="label"
          type="text"
          autoComplete="off"
          maxLength={LABEL_MAX}
          placeholder="e.g. Jordan"
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          aria-describedby={`text-phone-label-help${errorId}`}
          required
          disabled={busy}
          data-testid="input-phone-label"
        />
        <p id="text-phone-label-help" className="text-xs text-muted-foreground">
          Who will text from this phone. Helpers do not need a FieldView login.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="text-phone-number" className="text-sm font-medium">
          Mobile number
        </label>
        <Input
          id="text-phone-number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={PHONE_MAX}
          placeholder="(214) 555-0100"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          aria-describedby={`text-phone-number-help${errorId}`}
          required
          disabled={busy}
          data-testid="input-phone-number"
        />
        <p id="text-phone-number-help" className="text-xs text-muted-foreground">
          US and Canadian mobile numbers only.
        </p>
      </div>

      <ConsentLine />

      {error && (
        <p
          role="alert"
          id="text-phone-add-error"
          data-testid="error-add-phone"
          className={ERROR_LINE}
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy}
        data-loading={busy ? 'true' : 'false'}
        data-testid="btn-add-phone"
      >
        {busy ? 'Working…' : 'Get code'}
      </Button>
    </form>
  );
}

/** The code to text, from the phone it was made for. */
function CodePanel({ phoneId, name, held }: { phoneId: string; name: string; held: HeldCode }) {
  const minutes = `${held.minutes} minute${held.minutes === 1 ? '' : 's'}`;
  return (
    <div
      data-testid={`panel-phone-code-${phoneId}`}
      className="rounded-lg border bg-muted/40 p-3 space-y-3"
    >
      <p className="text-sm leading-relaxed" data-testid={`text-phone-code-${phoneId}`}>
        {`From ${name}'s phone, text `}
        <span className="font-mono text-lg font-semibold tracking-wider whitespace-nowrap select-all">
          LINK {held.code}
        </span>
        {` to ${formatPhoneForDisplay(held.productNumber)} within ${minutes}.`}
      </p>
      {held.smsHref.startsWith('sms:') && (
        <div className="space-y-1">
          <Button asChild size="sm" data-testid={`link-open-messages-${phoneId}`}>
            <a href={held.smsHref}>Open messages on this phone</a>
          </Button>
          <p className="text-xs text-muted-foreground" data-testid={`hint-open-messages-${phoneId}`}>
            {`Only when this page is open on ${name}'s phone. Otherwise give ${name} the code.`}
          </p>
        </div>
      )}
    </div>
  );
}

function PhoneFacts({ phone, timeZone }: { phone: CoachTextPhoneStatus; timeZone: string }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {phone.verifiedAt && (
        <>
          <dt className="text-muted-foreground">Linked</dt>
          <dd data-testid={`text-phone-linked-at-${phone.id}`}>
            {formatWhen(phone.verifiedAt, timeZone, DAY)}
          </dd>
        </>
      )}
      <dt className="text-muted-foreground">Last text</dt>
      <dd data-testid={`text-phone-last-text-${phone.id}`}>
        {phone.lastCommandAt ? formatWhen(phone.lastCommandAt, timeZone, DAY_AND_TIME) : 'None yet'}
      </dd>
    </dl>
  );
}

interface RemoveControlProps {
  phoneId: string;
  name: string;
  confirming: boolean;
  busy: boolean;
  error: string | null;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Removing takes two steps, so one stray tap cannot cut a phone off on game day. */
function RemoveControl({
  phoneId,
  name,
  confirming,
  busy,
  error,
  onAsk,
  onConfirm,
  onCancel,
}: RemoveControlProps) {
  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAsk}
        aria-label={`Remove ${name}'s phone`}
        data-testid={`btn-remove-phone-${phoneId}`}
      >
        Remove
      </Button>
    );
  }
  return (
    <div
      data-testid={`confirm-remove-phone-${phoneId}`}
      role="group"
      aria-label={`Remove ${name}'s phone`}
      className="basis-full rounded-lg border p-3 space-y-2"
    >
      <p className="text-sm">
        {`Remove ${name}'s phone? Texts from it will stop working for this account.`}
      </p>
      {error && (
        <p role="alert" data-testid={`error-remove-phone-${phoneId}`} className={ERROR_LINE}>
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
          data-testid={`btn-confirm-remove-phone-${phoneId}`}
        >
          {busy ? 'Working…' : 'Remove now'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onCancel}
          data-testid={`btn-cancel-remove-phone-${phoneId}`}
        >
          Keep it
        </Button>
      </div>
    </div>
  );
}

interface PhoneRowProps {
  phone: CoachTextPhoneStatus;
  view: RowView;
  /** The code to show, while it is live and this browser holds it. */
  held: HeldCode | null;
  countdown: string | null;
  /** The phone's LINK text arrived while the page was open. */
  justLinked: boolean;
  productNumber: string;
  timeZone: string;
  ui: RowUi;
  onNewCode: () => void;
  onAskRemove: () => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
}

function PhoneRow({
  phone,
  view,
  held,
  countdown,
  justLinked,
  productNumber,
  timeZone,
  ui,
  onNewCode,
  onAskRemove,
  onConfirmRemove,
  onCancelRemove,
}: PhoneRowProps) {
  const { id, label: name } = phone;
  const canRenew = view === 'waiting' || view === 'code_expired' || view === 'expired';
  return (
    <li data-testid={`row-text-phone-${id}`} data-state={view} className="p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium break-words" data-testid={`text-phone-label-${id}`}>
            {name}
          </p>
          {phone.phoneMasked && (
            <p className="text-sm text-muted-foreground" data-testid={`text-phone-number-${id}`}>
              {phone.phoneMasked}
            </p>
          )}
        </div>
        <span data-testid={`status-phone-${id}`} data-state={view} className={`${PILL} shrink-0`}>
          {ROW_LABELS[view]}
        </span>
      </div>

      {view === 'waiting' && (
        <div className="space-y-2">
          <p
            role="status"
            data-testid={`text-phone-waiting-${id}`}
            className="text-sm text-muted-foreground"
          >
            {`Waiting for ${name}'s text…`}
          </p>
          {held ? (
            <CodePanel phoneId={id} name={name} held={held} />
          ) : (
            <p className="text-sm" data-testid={`text-phone-code-hidden-${id}`}>
              {`The code is shown only once. If ${name} does not have it, get a new code.`}
            </p>
          )}
          {countdown && (
            <p data-testid={`text-phone-countdown-${id}`} className="text-sm text-muted-foreground">
              Code expires in {countdown}
            </p>
          )}
          {phone.unverifiedTextSeen && (
            <div
              data-testid={`notice-phone-unverified-${id}`}
              role="status"
              className={NOTICE_AMBER}
            >
              A text arrived but could not be verified. Send it again.
            </div>
          )}
        </div>
      )}

      {view === 'code_expired' && (
        <p data-testid={`notice-phone-code-expired-${id}`} role="status" className={NOTICE_AMBER}>
          That code has expired. Get a new one.
        </p>
      )}

      {view === 'linked' && justLinked && (
        <div data-testid={`notice-phone-linked-${id}`} role="status" className={NOTICE_GREEN}>
          {`${name}'s phone is linked.`}
        </div>
      )}

      {view === 'paused' && (
        <div data-testid={`notice-phone-paused-${id}`} className={`${NOTICE_AMBER} space-y-1`}>
          <p>This phone texted STOP, so commands are paused and FieldView cannot reply.</p>
          <p>Text START to {formatPhoneForDisplay(productNumber)} to turn it back on.</p>
        </div>
      )}

      {view === 'expired' && (
        <p data-testid={`notice-phone-expired-${id}`} className="text-sm">
          Not used for a long time, so its link was turned off. Get a new code to link it again.
        </p>
      )}

      {(view === 'linked' || view === 'paused' || view === 'expired') && (
        <PhoneFacts phone={phone} timeZone={timeZone} />
      )}

      {ui.codeError && (
        <p role="alert" data-testid={`error-phone-${id}`} className={ERROR_LINE}>
          {ui.codeError}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-2">
        {canRenew && (
          <Button
            type="button"
            size="sm"
            variant={view === 'waiting' ? 'outline' : 'default'}
            disabled={ui.codeBusy}
            data-loading={ui.codeBusy ? 'true' : 'false'}
            onClick={onNewCode}
            aria-label={`New code for ${name}'s phone`}
            data-testid={`btn-new-code-${id}`}
          >
            {ui.codeBusy ? 'Working…' : 'New code'}
          </Button>
        )}
        <RemoveControl
          phoneId={id}
          name={name}
          confirming={ui.confirmingRemove}
          busy={ui.removeBusy}
          error={ui.removeError}
          onAsk={onAskRemove}
          onConfirm={onConfirmRemove}
          onCancel={onCancelRemove}
        />
      </div>
    </li>
  );
}

/** `1 to 9, 0` becomes `1-to-9-0`, for a test id. */
function commandTestId(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
          No commands are available right now.
        </p>
      ) : (
        <>
          <ul data-testid="list-text-commands-commands" className="space-y-1 text-sm">
            {status.commands.map((command) => (
              <li
                key={command.word}
                data-testid={`text-command-${commandTestId(command.word)}`}
                className="flex gap-3"
              >
                <span className="shrink-0 font-mono font-semibold">{command.word}</span>
                <span className="text-muted-foreground">{command.description}</span>
              </li>
            ))}
          </ul>
          <p data-testid="text-commands-note" className="text-xs text-muted-foreground">
            A stream put on a game by text stays there until someone changes it, by text or on the
            game page. Text UNDO within 30 minutes to put the earlier stream back. Viewers who are
            already watching may need to refresh.
          </p>
        </>
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
                  {item.phoneLabel && (
                    <>
                      {' · '}
                      <span data-testid="text-history-phone" className="font-medium text-foreground">
                        {item.phoneLabel}
                      </span>
                    </>
                  )}
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

export default function OwnerTextCommandsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [{ status, codes, linked, linkCount }, dispatch] = useReducer(phonesReducer, NO_PHONES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Adding a phone.
  const [label, setLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // A new code or a remove, row by row.
  const [rowUi, setRowUi] = useState<Readonly<Partial<Record<string, RowUi>>>>({});

  // The account.
  const [pendingZone, setPendingZone] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [history, setHistory] = useState<CoachTextHistoryItem[] | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);

  /** Status checks that have not answered yet. */
  const checksOut = useRef(0);
  /** Goes up whenever the page learns something newer than a check that is still out. */
  const generation = useRef(0);

  const loadStatus = useCallback(async () => {
    const token = getOwnerToken();
    if (!token) return;
    generation.current += 1;
    setLoading(true);
    setError(null);
    try {
      dispatch({ type: 'status', status: await apiClient.ownerTextCommands(token) });
      setNow(Date.now());
    } catch (e) {
      setError(messageOf(e, 'Could not load text commands.'));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reads the list once. The regular check skips its turn while another is still out; a
   * forced one goes anyway, because the page needs the answer now and nothing older counts.
   * A failed check is left to the next one.
   */
  const check = useCallback(async (force = false) => {
    const token = getOwnerToken();
    if (!token || (!force && checksOut.current > 0)) return;
    if (force) generation.current += 1;
    checksOut.current += 1;
    const asked = generation.current;
    try {
      const next = await apiClient.ownerTextCommands(token);
      if (asked === generation.current) dispatch({ type: 'status', status: next });
    } catch {
      // Nothing to show: the next check is three seconds away.
    } finally {
      checksOut.current -= 1;
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

  const enabled = status?.enabled === true;
  const phones = enabled ? status.phones : [];
  const rows = phones.map((row) => {
    const held = codes.get(row.id);
    const expiresAtMs = codeExpiryOf(row, held);
    return { phone: row, held, expiresAtMs, view: rowViewOf(row, expiresAtMs, now) };
  });
  const liveExpiries = rows
    .filter((row) => row.view === 'waiting')
    .map((row) => row.expiresAtMs);
  const watching = liveExpiries.length > 0;
  const nextExpiryMs = watching ? Math.min(...liveExpiries) : Number.NaN;

  // While any code is live: count down every second and check for the text every three.
  useEffect(() => {
    if (!watching) return undefined;
    const tick = setInterval(() => {
      const at = Date.now();
      setNow(at);
      // A watch ends as its code runs out. A phone's browser sleeps while its owner is away
      // sending the text, so ask one last time before saying the code ran out.
      if (at >= nextExpiryMs) void check();
    }, TICK_MS);
    const poll = setInterval(() => void check(), POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [watching, check, nextExpiryMs]);

  // The recent texts, when the page opens and again each time a phone is linked.
  useEffect(() => {
    if (!enabled) return undefined;
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
  }, [enabled, linkCount]);

  function logout() {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_token_expires');
    router.push('/owners/login');
  }

  function patchRow(id: string, patch: Partial<RowUi>) {
    setRowUi((current) => ({ ...current, [id]: { ...(current[id] ?? IDLE_ROW), ...patch } }));
  }

  function forgetRow(id: string) {
    setRowUi((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));
  }

  /** Keeps a code the API just gave, and shows it in its row. */
  function holdCode(code: CoachTextPhoneCode, name: string) {
    const at = Date.now();
    // A check that is still out was asked before this code existed.
    generation.current += 1;
    dispatch({ type: 'code', code, label: name, minutes: minutesUntil(code.codeExpiresAt, at) });
    setNow(at);
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addBusy || !status) return;
    const token = getOwnerToken();
    if (!token) return;
    const name = label.trim();
    const number = phone.trim();
    if (!name) {
      setAddError('Enter a name.');
      return;
    }
    if (!number) {
      setAddError('Enter a mobile number.');
      return;
    }
    setAddBusy(true);
    setAddError(null);
    try {
      const timeZone = browserTimeZone();
      holdCode(
        await apiClient.ownerTextCommandsAddPhone(token, {
          label: name,
          phone: number,
          ...(timeZone ? { timeZone } : {}),
        }),
        name
      );
      setLabel('');
      setPhone('');
      // The list from the API, with the new row's masked number.
      void check(true);
    } catch (e) {
      setAddError(addErrorMessage(e));
      // The list filled up somewhere else: read it again, which hides the form.
      if (reasonOf(e) === 'PHONE_LIMIT_REACHED') void check(true);
    } finally {
      setAddBusy(false);
    }
  }

  async function handleNewCode(target: CoachTextPhoneStatus) {
    const token = getOwnerToken();
    if (!token || rowUi[target.id]?.codeBusy) return;
    patchRow(target.id, { codeBusy: true, codeError: null });
    try {
      holdCode(await apiClient.ownerTextCommandsNewCode(token, target.id), target.label);
      patchRow(target.id, { codeBusy: false });
    } catch (e) {
      patchRow(target.id, { codeBusy: false, codeError: newCodeErrorMessage(e) });
      const reason = reasonOf(e);
      // The row is out of date: the phone was linked, or removed, somewhere else.
      if (reason === 'PHONE_ALREADY_LINKED' || reason === 'NOT_FOUND') void check(true);
    }
  }

  async function handleRemove(target: CoachTextPhoneStatus) {
    const token = getOwnerToken();
    if (!token || rowUi[target.id]?.removeBusy) return;
    patchRow(target.id, { removeBusy: true, removeError: null });
    try {
      await apiClient.ownerTextCommandsRemovePhone(token, target.id);
    } catch (e) {
      // NOT_FOUND: the phone is gone already, which is what the owner asked for.
      if (reasonOf(e) !== 'NOT_FOUND') {
        patchRow(target.id, {
          removeBusy: false,
          removeError: messageOf(e, 'Could not remove this phone. Try again.'),
        });
        return;
      }
    }
    // A check that is still out could bring the phone back.
    generation.current += 1;
    dispatch({ type: 'removed', id: target.id });
    forgetRow(target.id);
  }

  async function handleZoneChange(zone: string) {
    const token = getOwnerToken();
    if (!token || !status || pendingZone !== null || zone === status.timeZone) return;
    setPendingZone(zone);
    setZoneError(null);
    try {
      const saved = await apiClient.ownerTextCommandsSetTimeZone(token, zone);
      dispatch({ type: 'timeZone', timeZone: saved.timeZone });
    } catch (e) {
      setZoneError(messageOf(e, 'Could not save the time zone.'));
    } finally {
      setPendingZone(null);
    }
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
                Link your phones, then run game day by text
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
        ) : status ? (
          <Card data-testid="panel-text-commands">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Text commands</CardTitle>
                <span
                  data-testid="status-text-commands"
                  data-state={enabled ? 'on' : 'off'}
                  className={PILL}
                >
                  {enabled ? `${phones.length} of ${status.maxPhones} phones` : 'Not turned on'}
                </span>
              </div>
              <CardDescription>
                Run game day from your phones. Text FieldView to put your live camera stream on a
                game page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!enabled ? (
                <p data-testid="text-commands-off" className="text-sm">
                  Text commands are not turned on for this account yet.
                </p>
              ) : (
                <>
                  <section
                    aria-labelledby="text-phones-heading"
                    className="space-y-2"
                    data-testid="section-text-phones"
                  >
                    <h4 id="text-phones-heading" className="text-sm font-semibold">
                      Phones
                    </h4>
                    {rows.length === 0 ? (
                      <p data-testid="empty-text-phones" className="text-sm text-muted-foreground">
                        No phones yet. Add your phone, and one for each helper.
                      </p>
                    ) : (
                      <ul data-testid="list-text-phones" className="divide-y rounded-lg border">
                        {rows.map(({ phone: row, held, expiresAtMs, view }) => (
                          <PhoneRow
                            key={row.id}
                            phone={row}
                            view={view}
                            held={view === 'waiting' ? held ?? null : null}
                            countdown={
                              view === 'waiting' ? formatCountdown(expiresAtMs - now) : null
                            }
                            justLinked={linked.has(row.id)}
                            productNumber={status.productNumber}
                            timeZone={status.timeZone}
                            ui={rowUi[row.id] ?? IDLE_ROW}
                            onNewCode={() => void handleNewCode(row)}
                            onAskRemove={() => patchRow(row.id, { confirmingRemove: true })}
                            onConfirmRemove={() => void handleRemove(row)}
                            onCancelRemove={() =>
                              patchRow(row.id, { confirmingRemove: false, removeError: null })
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </section>

                  {phones.length >= status.maxPhones ? (
                    <p data-testid="notice-phone-limit" role="status" className={NOTICE_AMBER}>
                      {`This login has ${status.maxPhones} phones, the most it can have. Remove one to add another.`}
                    </p>
                  ) : (
                    <AddPhoneForm
                      label={label}
                      onLabelChange={setLabel}
                      phone={phone}
                      onPhoneChange={setPhone}
                      busy={addBusy}
                      error={addError}
                      onSubmit={(event) => void handleAdd(event)}
                    />
                  )}

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
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
