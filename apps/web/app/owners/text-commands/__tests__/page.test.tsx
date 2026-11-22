/**
 * Owner text commands page: every state it can show, the wait for the text that links a
 * phone, and the two-step unlink.
 */

import { buildOwnerCommandsConsentPlain, type CoachTextStatus } from '@fieldview/data-model';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

import OwnerTextCommandsPage from '../page';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: { children: ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    ownerTextCommands: vi.fn(),
    ownerTextCommandsStartLink: vi.fn(),
    ownerTextCommandsUnlink: vi.fn(),
    ownerTextCommandsSetTimeZone: vi.fn(),
    ownerTextCommandsHistory: vi.fn(),
  },
}));

const getStatus = vi.mocked(apiClient.ownerTextCommands);
const startLink = vi.mocked(apiClient.ownerTextCommandsStartLink);
const unlink = vi.mocked(apiClient.ownerTextCommandsUnlink);
const setTimeZone = vi.mocked(apiClient.ownerTextCommandsSetTimeZone);
const getHistory = vi.mocked(apiClient.ownerTextCommandsHistory);

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
  },
});

/** Noon in Chicago. */
const NOW = '2026-11-21T18:00:00.000Z';
const CODE_EXPIRES = '2026-11-21T18:10:00.000Z';

function aStatus(overrides: Partial<CoachTextStatus> = {}): CoachTextStatus {
  return {
    enabled: true,
    state: 'none',
    productNumber: '+18773435308',
    phoneMasked: null,
    pendingPhoneMasked: null,
    codeExpiresAt: null,
    unverifiedTextSeen: false,
    verifiedAt: null,
    lastCommandAt: null,
    timeZone: 'America/Chicago',
    commands: [],
    ...overrides,
  };
}

const WAITING = aStatus({
  state: 'pending',
  pendingPhoneMasked: '(***) ***-0100',
  codeExpiresAt: CODE_EXPIRES,
});

const LINKED = aStatus({
  state: 'linked',
  phoneMasked: '(***) ***-0100',
  // 9:30 in the morning, then 7:04 in the evening, both on Nov 20 in Chicago.
  verifiedAt: '2026-11-20T15:30:00.000Z',
  lastCommandAt: '2026-11-21T01:04:00.000Z',
});

function aStartedLink(overrides: Record<string, string> = {}) {
  return {
    code: '482913',
    codeExpiresAt: CODE_EXPIRES,
    productNumber: '+18773435308',
    smsHref: 'sms:+18773435308?&body=LINK%20482913',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let zoneSpy: { mockRestore: () => void } | undefined;

/** Makes the browser report this time zone (an empty one means it does not say). */
function browserIsIn(zone: string) {
  zoneSpy?.mockRestore();
  const real = new Intl.DateTimeFormat().resolvedOptions();
  zoneSpy = vi
    .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
    .mockReturnValue({ ...real, timeZone: zone });
}

/** Lets the clock run, then lets everything that was waiting on it settle. */
async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  // A second turn for anything the first one started, such as a request made by an effect.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

/** Answers a request the page is waiting on, and lets the page take the answer in. */
async function settle(answerIt: () => void) {
  await act(async () => {
    answerIt();
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function renderPage() {
  render(<OwnerTextCommandsPage />);
  await flush();
}

function pill() {
  return screen.getByTestId('status-text-commands');
}

function typePhone(value: string) {
  fireEvent.change(screen.getByTestId('input-text-commands-phone'), { target: { value } });
}

async function askForCode(phone = '214-555-0100') {
  typePhone(phone);
  fireEvent.submit(screen.getByTestId('form-text-commands-link'));
  await flush();
}

/** Opens the page with no phone linked, asks for a code, and leaves it waiting for the text. */
async function startWaiting() {
  getStatus.mockResolvedValueOnce(aStatus());
  getStatus.mockResolvedValue(WAITING);
  startLink.mockResolvedValue(aStartedLink());
  await renderPage();
  await askForCode();
}

describe('OwnerTextCommandsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    vi.resetAllMocks();
    store.clear();
    sessionStorage.clear();
    localStorage.setItem('owner_token', 'owner-jwt');
    browserIsIn('America/Chicago');
    getHistory.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    zoneSpy?.mockRestore();
    zoneSpy = undefined;
    vi.useRealTimers();
  });

  describe('signing in', () => {
    it('sends a signed-out owner to the login page without calling the API', async () => {
      store.clear();

      await renderPage();

      expect(replace).toHaveBeenCalledWith('/owners/login');
      expect(getStatus).not.toHaveBeenCalled();
    });

    it('sends an owner whose session has run out to the login page', async () => {
      localStorage.setItem('owner_token_expires', '2026-11-21T17:59:00.000Z');

      await renderPage();

      expect(replace).toHaveBeenCalledWith('/owners/login');
      expect(getStatus).not.toHaveBeenCalled();
    });

    it('signs the owner out', async () => {
      localStorage.setItem('owner_token_expires', '2026-11-22T18:00:00.000Z');
      getStatus.mockResolvedValue(aStatus());
      await renderPage();

      fireEvent.click(screen.getByTestId('btn-logout'));

      expect(localStorage.getItem('owner_token')).toBeNull();
      expect(localStorage.getItem('owner_token_expires')).toBeNull();
      expect(push).toHaveBeenCalledWith('/owners/login');
    });

    it('goes back to the dashboard', async () => {
      getStatus.mockResolvedValue(aStatus());
      await renderPage();

      fireEvent.click(screen.getByTestId('link-dashboard'));

      expect(push).toHaveBeenCalledWith('/owners/dashboard');
    });
  });

  describe('loading', () => {
    it('shows an error when the status cannot be loaded, and can try again', async () => {
      getStatus.mockRejectedValueOnce(new Error('Could not reach FieldView.'));
      await renderPage();

      const banner = screen.getByTestId('text-commands-error');
      expect(banner).toHaveTextContent('Could not reach FieldView.');
      expect(screen.queryByTestId('status-text-commands')).not.toBeInTheDocument();

      getStatus.mockResolvedValue(aStatus());
      fireEvent.click(within(banner).getByRole('button', { name: 'Retry' }));
      await flush();

      expect(screen.queryByTestId('text-commands-error')).not.toBeInTheDocument();
      expect(pill()).toHaveAttribute('data-state', 'not_linked');
    });

    it('says so when text commands are not turned on for the account', async () => {
      getStatus.mockResolvedValue(aStatus({ enabled: false }));

      await renderPage();

      expect(getStatus).toHaveBeenCalledWith('owner-jwt');
      expect(pill()).toHaveAttribute('data-state', 'off');
      expect(pill()).toHaveTextContent('Not turned on');
      expect(screen.getByTestId('text-commands-off')).toHaveTextContent(
        'Text commands are not turned on for this account yet.'
      );
      expect(screen.queryByTestId('form-text-commands-link')).not.toBeInTheDocument();
      expect(getHistory).not.toHaveBeenCalled();

      await flush(10_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('an owner with no phone linked', () => {
    it('offers the link form with the consent wording', async () => {
      getStatus.mockResolvedValue(aStatus());

      await renderPage();

      expect(pill()).toHaveAttribute('data-state', 'not_linked');
      expect(pill()).toHaveTextContent('Not linked');
      expect(screen.getByTestId('form-text-commands-link')).toBeInTheDocument();
      expect(screen.getByLabelText('Mobile number')).toBe(
        screen.getByTestId('input-text-commands-phone')
      );
      expect(screen.getByLabelText('Time zone')).toBe(
        screen.getByTestId('select-text-commands-timezone')
      );
      expect(screen.getByTestId('consent-text-commands')).toHaveTextContent(
        buildOwnerCommandsConsentPlain()
      );
      expect(screen.getByTestId('link-text-commands-terms')).toHaveAttribute('href', '/terms#sms');
      expect(screen.getByTestId('link-text-commands-privacy')).toHaveAttribute('href', '/privacy');
      expect(screen.getByTestId('btn-text-commands-get-code')).toHaveTextContent('Get my code');
      expect(getHistory).not.toHaveBeenCalled();
    });

    it('starts the time zone on the one the browser is in', async () => {
      browserIsIn('America/Denver');
      getStatus.mockResolvedValue(aStatus());

      await renderPage();

      expect(screen.getByTestId('select-text-commands-timezone')).toHaveValue('America/Denver');
    });

    it('adds the browser time zone to the list when it is not one of the common ones', async () => {
      browserIsIn('America/Indiana/Indianapolis');
      getStatus.mockResolvedValue(aStatus());

      await renderPage();

      const select = screen.getByTestId('select-text-commands-timezone');
      expect(select).toHaveValue('America/Indiana/Indianapolis');
      expect(
        within(select).getByRole('option', { name: 'America/Indiana/Indianapolis' })
      ).toBeInTheDocument();
    });

    it('falls back to the account time zone when the browser does not say', async () => {
      browserIsIn('');
      getStatus.mockResolvedValue(aStatus({ timeZone: 'America/Los_Angeles' }));

      await renderPage();

      expect(screen.getByTestId('select-text-commands-timezone')).toHaveValue(
        'America/Los_Angeles'
      );
    });

    it('asks for a code and shows what to text, where to, and for how long', async () => {
      getStatus.mockResolvedValue(aStatus());
      startLink.mockResolvedValue(aStartedLink());
      await renderPage();

      typePhone('214-555-0100');
      fireEvent.change(screen.getByTestId('select-text-commands-timezone'), {
        target: { value: 'America/New_York' },
      });
      fireEvent.submit(screen.getByTestId('form-text-commands-link'));
      await flush();

      expect(startLink).toHaveBeenCalledTimes(1);
      expect(startLink).toHaveBeenCalledWith('owner-jwt', {
        phone: '214-555-0100',
        timeZone: 'America/New_York',
      });
      expect(pill()).toHaveAttribute('data-state', 'waiting');
      expect(pill()).toHaveTextContent('Step 2 of 2');
      expect(screen.getByTestId('text-commands-from')).toHaveTextContent(
        'From (214) 555-0100, text this:'
      );
      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 482913');
      expect(screen.getByTestId('text-commands-to')).toHaveTextContent('to (877) 343-5308');
      expect(screen.getByTestId('btn-text-commands-open-messages')).toHaveAttribute(
        'href',
        'sms:+18773435308?&body=LINK%20482913'
      );
      expect(screen.getByTestId('text-commands-waiting')).toHaveTextContent(
        'Waiting for your text'
      );
      expect(screen.getByTestId('text-commands-countdown')).toHaveTextContent(
        'Code expires in 10:00'
      );
      expect(screen.queryByTestId('form-text-commands-link')).not.toBeInTheDocument();
    });

    it('sends the browser time zone when the owner leaves it alone', async () => {
      browserIsIn('America/Denver');
      getStatus.mockResolvedValue(aStatus());
      startLink.mockResolvedValue(aStartedLink());
      await renderPage();

      await askForCode(' (214) 555-0100 ');

      expect(startLink).toHaveBeenCalledWith('owner-jwt', {
        phone: '(214) 555-0100',
        timeZone: 'America/Denver',
      });
    });

    it('marks the button busy while the code is on its way, and asks only once', async () => {
      const answer = deferred<ReturnType<typeof aStartedLink>>();
      getStatus.mockResolvedValue(aStatus());
      startLink.mockReturnValue(answer.promise);
      await renderPage();

      await askForCode();

      const button = screen.getByTestId('btn-text-commands-get-code');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-loading', 'true');

      fireEvent.submit(screen.getByTestId('form-text-commands-link'));
      await flush();
      expect(startLink).toHaveBeenCalledTimes(1);

      await settle(() => answer.resolve(aStartedLink()));
      await flush();
      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 482913');
    });

    it('keeps the form and the typed number when a code cannot be had', async () => {
      getStatus.mockResolvedValue(aStatus());
      startLink.mockRejectedValue(new Error('Too many link codes. Try again in a few minutes.'));
      await renderPage();

      await askForCode();

      expect(screen.getByTestId('error-text-commands-link')).toHaveTextContent(
        'Too many link codes. Try again in a few minutes.'
      );
      expect(screen.getByTestId('input-text-commands-phone')).toHaveValue('214-555-0100');
      expect(pill()).toHaveAttribute('data-state', 'not_linked');
      const button = screen.getByTestId('btn-text-commands-get-code');
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('data-loading', 'false');
    });

    it('gives a plain reason when the failure does not come with one', async () => {
      getStatus.mockResolvedValue(aStatus());
      startLink.mockRejectedValue('nope');
      await renderPage();

      await askForCode();

      expect(screen.getByTestId('error-text-commands-link')).toHaveTextContent(
        'Could not get a code. Try again.'
      );
    });

    it('does not ask for a code without a number', async () => {
      getStatus.mockResolvedValue(aStatus());
      await renderPage();

      await askForCode('   ');

      expect(startLink).not.toHaveBeenCalled();
      expect(screen.getByTestId('error-text-commands-link')).toHaveTextContent(
        'Enter your mobile number.'
      );
    });
  });

  describe('waiting for the text', () => {
    it('keeps the code out of browser storage', async () => {
      await startWaiting();

      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 482913');
      expect([...store.keys()]).toEqual(['owner_token']);
      expect([...store.values()].join(' ')).not.toContain('482913');
      expect(sessionStorage.length).toBe(0);
    });

    it('checks every three seconds and stops once the phone is linked', async () => {
      await startWaiting();
      expect(getStatus).toHaveBeenCalledTimes(1);

      await flush(2_999);
      expect(getStatus).toHaveBeenCalledTimes(1);

      await flush(1);
      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(pill()).toHaveAttribute('data-state', 'waiting');
      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 482913');

      getStatus.mockResolvedValue(LINKED);
      await flush(3_000);

      expect(getStatus).toHaveBeenCalledTimes(3);
      expect(pill()).toHaveAttribute('data-state', 'linked');
      expect(pill()).toHaveTextContent('Linked');
      expect(screen.getByTestId('notice-text-commands-linked')).toHaveTextContent(
        'Your phone is linked.'
      );
      expect(screen.queryByTestId('text-commands-code')).not.toBeInTheDocument();

      await flush(30_000);
      expect(getStatus).toHaveBeenCalledTimes(3);
    });

    it('does not pile a second check on one that has not answered', async () => {
      await startWaiting();
      const slow = deferred<CoachTextStatus>();
      getStatus.mockReturnValue(slow.promise);

      await flush(3_000);
      await flush(3_000);
      await flush(3_000);
      expect(getStatus).toHaveBeenCalledTimes(2);

      await settle(() => slow.resolve(WAITING));
      await flush(3_000);
      expect(getStatus).toHaveBeenCalledTimes(3);
    });

    it('keeps waiting when a check fails', async () => {
      await startWaiting();
      getStatus.mockRejectedValue(new Error('offline'));

      await flush(3_000);

      expect(pill()).toHaveAttribute('data-state', 'waiting');
      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 482913');
      expect(screen.queryByTestId('text-commands-error')).not.toBeInTheDocument();

      getStatus.mockResolvedValue(LINKED);
      await flush(3_000);
      expect(pill()).toHaveAttribute('data-state', 'linked');
    });

    it('counts the code down', async () => {
      await startWaiting();

      await flush(19_000);

      expect(screen.getByTestId('text-commands-countdown')).toHaveTextContent(
        'Code expires in 9:41'
      );
    });

    it('hides the code and stops checking when the code runs out', async () => {
      await startWaiting();

      await flush(10 * 60_000);

      expect(screen.queryByTestId('text-commands-code')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-text-commands-open-messages')).not.toBeInTheDocument();
      expect(screen.queryByTestId('text-commands-countdown')).not.toBeInTheDocument();
      expect(screen.getByTestId('text-commands-code-expired')).toHaveTextContent(
        'That code has expired.'
      );
      expect(screen.getByTestId('btn-text-commands-start-over')).toBeInTheDocument();

      const checks = getStatus.mock.calls.length;
      await flush(30_000);
      expect(getStatus).toHaveBeenCalledTimes(checks);
    });

    it('asks once more as the code runs out, in case the text came while the page slept', async () => {
      await startWaiting();
      expect(getStatus).toHaveBeenCalledTimes(1);

      // The owner was away in the messages app: the clock moved on and no check ran.
      vi.setSystemTime(new Date('2026-11-21T18:11:00.000Z'));
      getStatus.mockResolvedValue(LINKED);
      await flush(1_000);

      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(pill()).toHaveAttribute('data-state', 'linked');
      expect(screen.getByTestId('notice-text-commands-linked')).toBeInTheDocument();
      expect(screen.queryByTestId('text-commands-code-expired')).not.toBeInTheDocument();

      await flush(30_000);
      expect(getStatus).toHaveBeenCalledTimes(2);
    });

    it('goes back to the form when the code has run out and no text came', async () => {
      await startWaiting();

      vi.setSystemTime(new Date('2026-11-21T18:11:00.000Z'));
      getStatus.mockResolvedValue(aStatus());
      await flush(1_000);

      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(pill()).toHaveAttribute('data-state', 'not_linked');
      expect(screen.getByTestId('form-text-commands-link')).toBeInTheDocument();
      expect(screen.getByTestId('notice-text-commands-code-expired')).toHaveTextContent(
        'That code has expired.'
      );
      expect(screen.queryByTestId('text-commands-code-expired')).not.toBeInTheDocument();

      await flush(30_000);
      expect(getStatus).toHaveBeenCalledTimes(2);
    });

    it('says when a text arrived that could not be verified', async () => {
      await startWaiting();
      expect(screen.queryByTestId('notice-text-commands-unverified')).not.toBeInTheDocument();

      getStatus.mockResolvedValue({ ...WAITING, unverifiedTextSeen: true });
      await flush(3_000);

      expect(screen.getByTestId('notice-text-commands-unverified')).toHaveTextContent(
        'A text arrived but could not be verified. Send it again.'
      );
      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 482913');
    });

    it('starts over without unlinking anything, and shows the second code', async () => {
      await startWaiting();

      fireEvent.click(screen.getByTestId('btn-text-commands-start-over'));
      await flush();

      expect(unlink).not.toHaveBeenCalled();
      expect(pill()).toHaveAttribute('data-state', 'not_linked');
      expect(screen.queryByTestId('text-commands-code')).not.toBeInTheDocument();
      expect(screen.getByTestId('input-text-commands-phone')).toHaveValue('214-555-0100');

      startLink.mockResolvedValue(
        aStartedLink({ code: '771204', smsHref: 'sms:+18773435308?&body=LINK%20771204' })
      );
      await askForCode('(214) 555-0199');

      expect(startLink).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('text-commands-from')).toHaveTextContent(
        'From (214) 555-0199, text this:'
      );
      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 771204');
      expect(screen.getByTestId('btn-text-commands-open-messages')).toHaveAttribute(
        'href',
        'sms:+18773435308?&body=LINK%20771204'
      );
    });

    it('goes back to the form when the code ran out on the server first', async () => {
      await startWaiting();
      getStatus.mockResolvedValue(aStatus());

      await flush(3_000);

      expect(pill()).toHaveAttribute('data-state', 'not_linked');
      expect(screen.getByTestId('form-text-commands-link')).toBeInTheDocument();
      expect(screen.getByTestId('notice-text-commands-code-expired')).toHaveTextContent(
        'That code has expired.'
      );
      expect(screen.queryByTestId('text-commands-code')).not.toBeInTheDocument();

      const checks = getStatus.mock.calls.length;
      await flush(9_000);
      expect(getStatus).toHaveBeenCalledTimes(checks);
    });

    it('does not interrupt an owner who already chose to start over', async () => {
      await startWaiting();
      fireEvent.click(screen.getByTestId('btn-text-commands-start-over'));
      getStatus.mockResolvedValue(aStatus());

      await flush(3_000);

      expect(screen.getByTestId('form-text-commands-link')).toBeInTheDocument();
      expect(screen.queryByTestId('notice-text-commands-code-expired')).not.toBeInTheDocument();
    });

    it('shows the linked phone even when the text lands after starting over', async () => {
      await startWaiting();
      fireEvent.click(screen.getByTestId('btn-text-commands-start-over'));
      getStatus.mockResolvedValue(LINKED);

      await flush(3_000);

      expect(pill()).toHaveAttribute('data-state', 'linked');
      expect(screen.getByTestId('notice-text-commands-linked')).toBeInTheDocument();
      expect(screen.queryByTestId('form-text-commands-link')).not.toBeInTheDocument();
    });

    it('does not let a late answer to an old check wipe a new code', async () => {
      await startWaiting();
      fireEvent.click(screen.getByTestId('btn-text-commands-start-over'));
      const oldCheck = deferred<CoachTextStatus>();
      getStatus.mockReturnValue(oldCheck.promise);
      await flush(3_000);
      expect(getStatus).toHaveBeenCalledTimes(2);

      startLink.mockResolvedValue(
        aStartedLink({ code: '771204', smsHref: 'sms:+18773435308?&body=LINK%20771204' })
      );
      await askForCode();
      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 771204');

      await settle(() => oldCheck.resolve(aStatus()));
      await flush();

      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 771204');
      expect(pill()).toHaveAttribute('data-state', 'waiting');
      expect(screen.queryByTestId('notice-text-commands-code-expired')).not.toBeInTheDocument();
    });

    it('hides the code after a reload, and still watches for the text', async () => {
      getStatus.mockResolvedValue(WAITING);

      await renderPage();

      expect(pill()).toHaveAttribute('data-state', 'waiting');
      expect(screen.queryByTestId('text-commands-code')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-text-commands-open-messages')).not.toBeInTheDocument();
      const hidden = screen.getByTestId('text-commands-code-hidden');
      expect(hidden).toHaveTextContent('(***) ***-0100');
      expect(hidden).toHaveTextContent('shown only once');
      expect(screen.getByTestId('text-commands-countdown')).toHaveTextContent(
        'Code expires in 10:00'
      );
      expect(screen.getByTestId('btn-text-commands-start-over')).toBeInTheDocument();

      getStatus.mockResolvedValue(LINKED);
      await flush(3_000);

      expect(pill()).toHaveAttribute('data-state', 'linked');
    });

    it('says the code has expired when the page opens after it ran out', async () => {
      getStatus.mockResolvedValue({ ...WAITING, codeExpiresAt: '2026-11-21T17:59:59.000Z' });

      await renderPage();

      expect(screen.getByTestId('text-commands-code-expired')).toBeInTheDocument();
      expect(screen.queryByTestId('text-commands-code-hidden')).not.toBeInTheDocument();
      await flush(9_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('a linked phone', () => {
    it('shows the phone, when it was linked and when it last texted', async () => {
      getStatus.mockResolvedValue(LINKED);

      await renderPage();

      expect(pill()).toHaveAttribute('data-state', 'linked');
      expect(pill()).toHaveTextContent('Linked');
      expect(screen.getByTestId('text-commands-phone')).toHaveTextContent('(***) ***-0100');
      expect(screen.getByTestId('text-commands-linked-at')).toHaveTextContent('Nov 20, 2026');
      expect(screen.getByTestId('text-commands-last-text')).toHaveTextContent(/Nov 20, 7:04\sPM/);
      expect(screen.getByTestId('select-text-commands-timezone')).toHaveValue('America/Chicago');
      expect(screen.getByTestId('text-commands-number')).toHaveTextContent('Text (877) 343-5308:');
      expect(screen.getByTestId('text-commands-commands-soon')).toHaveTextContent(
        'Commands arrive with the next update.'
      );
      expect(screen.queryByTestId('form-text-commands-link')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notice-text-commands-linked')).not.toBeInTheDocument();

      await flush(10_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });

    it('shows times in the time zone of the account, not of the browser', async () => {
      browserIsIn('America/New_York');
      getStatus.mockResolvedValue({ ...LINKED, timeZone: 'America/Los_Angeles' });

      await renderPage();

      expect(screen.getByTestId('text-commands-last-text')).toHaveTextContent(/Nov 20, 5:04\sPM/);
      expect(screen.getByTestId('select-text-commands-timezone')).toHaveValue(
        'America/Los_Angeles'
      );
    });

    it('lists the commands once there are some', async () => {
      getStatus.mockResolvedValue({
        ...LINKED,
        commands: [
          { word: 'LIVE', description: 'See which camera streams are live.' },
          { word: 'MENU', description: 'See every command.' },
        ],
      });

      await renderPage();

      const rows = within(screen.getByTestId('list-text-commands-commands')).getAllByRole(
        'listitem'
      );
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('LIVE');
      expect(rows[0]).toHaveTextContent('See which camera streams are live.');
      expect(rows[1]).toHaveTextContent('MENU');
      expect(screen.getByTestId('text-commands-number')).toHaveTextContent('Text (877) 343-5308:');
      expect(screen.queryByTestId('text-commands-commands-soon')).not.toBeInTheDocument();
    });

    it('shows the recent texts with what came of each', async () => {
      getStatus.mockResolvedValue(LINKED);
      getHistory.mockResolvedValue({
        items: [
          {
            createdAt: '2026-11-21T01:04:00.000Z',
            body: 'LINK ******',
            status: 'done',
            replyText: 'Linked. This phone can now run FieldView.Live by text.',
          },
          {
            createdAt: '2026-11-21T01:03:00.000Z',
            body: 'LINK ******',
            status: 'rejected',
            replyText: null,
          },
          {
            createdAt: '2026-11-21T01:02:00.000Z',
            body: 'hello',
            status: 'brand_new_outcome',
            replyText: null,
          },
        ],
      });

      await renderPage();

      expect(getHistory).toHaveBeenCalledTimes(1);
      expect(getHistory).toHaveBeenCalledWith('owner-jwt');
      const rows = within(screen.getByTestId('list-text-commands-history')).getAllByTestId(
        'row-text-commands-history'
      );
      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent(/Nov 20, 7:04\sPM/);
      expect(rows[0]).toHaveTextContent('LINK ******');
      expect(rows[0]).toHaveTextContent('Done');
      expect(rows[0]).toHaveTextContent('Linked. This phone can now run FieldView.Live by text.');
      expect(rows[1]).toHaveTextContent('Not accepted');
      expect(rows[2]).toHaveTextContent('hello');
      expect(rows[2]).toHaveTextContent('brand new outcome');
      expect(screen.queryByTestId('empty-text-commands-history')).not.toBeInTheDocument();
    });

    it('says so when there are no texts yet', async () => {
      getStatus.mockResolvedValue(LINKED);
      getHistory.mockResolvedValue({ items: [] });

      await renderPage();

      expect(screen.getByTestId('empty-text-commands-history')).toHaveTextContent('No texts yet.');
      expect(screen.queryByTestId('list-text-commands-history')).not.toBeInTheDocument();
    });

    it('keeps the rest of the page when the recent texts cannot be loaded', async () => {
      getStatus.mockResolvedValue(LINKED);
      getHistory.mockRejectedValue(new Error('boom'));

      await renderPage();

      expect(screen.getByTestId('error-text-commands-history')).toHaveTextContent(
        'Recent texts could not be loaded.'
      );
      expect(screen.getByTestId('text-commands-phone')).toHaveTextContent('(***) ***-0100');
      expect(screen.queryByTestId('text-commands-error')).not.toBeInTheDocument();
    });

    it('saves a new time zone as soon as it is picked', async () => {
      getStatus.mockResolvedValue(LINKED);
      setTimeZone.mockResolvedValue({ ...LINKED, timeZone: 'America/New_York' });
      await renderPage();

      fireEvent.change(screen.getByTestId('select-text-commands-timezone'), {
        target: { value: 'America/New_York' },
      });
      await flush();

      expect(setTimeZone).toHaveBeenCalledTimes(1);
      expect(setTimeZone).toHaveBeenCalledWith('owner-jwt', 'America/New_York');
      expect(screen.getByTestId('select-text-commands-timezone')).toHaveValue('America/New_York');
      expect(screen.getByTestId('text-commands-last-text')).toHaveTextContent(/Nov 20, 8:04\sPM/);
      expect(screen.queryByTestId('error-text-commands-timezone')).not.toBeInTheDocument();
    });

    it('marks the time zone busy while it saves', async () => {
      const answer = deferred<CoachTextStatus>();
      getStatus.mockResolvedValue(LINKED);
      setTimeZone.mockReturnValue(answer.promise);
      await renderPage();

      fireEvent.change(screen.getByTestId('select-text-commands-timezone'), {
        target: { value: 'America/Denver' },
      });
      await flush();

      const select = screen.getByTestId('select-text-commands-timezone');
      expect(select).toBeDisabled();
      expect(select).toHaveAttribute('data-loading', 'true');
      expect(select).toHaveValue('America/Denver');

      await settle(() => answer.resolve({ ...LINKED, timeZone: 'America/Denver' }));
      await flush();

      expect(screen.getByTestId('select-text-commands-timezone')).not.toBeDisabled();
      expect(screen.getByTestId('select-text-commands-timezone')).toHaveAttribute(
        'data-loading',
        'false'
      );
    });

    it('puts the time zone back when it cannot be saved', async () => {
      getStatus.mockResolvedValue(LINKED);
      setTimeZone.mockRejectedValue(new Error('Unknown time zone'));
      await renderPage();

      fireEvent.change(screen.getByTestId('select-text-commands-timezone'), {
        target: { value: 'America/Denver' },
      });
      await flush();

      expect(screen.getByTestId('select-text-commands-timezone')).toHaveValue('America/Chicago');
      expect(screen.getByTestId('error-text-commands-timezone')).toHaveTextContent(
        'Unknown time zone'
      );
      expect(screen.getByTestId('text-commands-last-text')).toHaveTextContent(/Nov 20, 7:04\sPM/);
    });

    it('asks before unlinking, then unlinks', async () => {
      getStatus.mockResolvedValueOnce(LINKED);
      getStatus.mockResolvedValue(aStatus());
      unlink.mockResolvedValue({ unlinked: true });
      await renderPage();

      fireEvent.click(screen.getByTestId('btn-text-commands-unlink'));

      expect(unlink).not.toHaveBeenCalled();
      expect(screen.getByTestId('confirm-text-commands-unlink')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('btn-text-commands-unlink-confirm'));
      await flush();

      expect(unlink).toHaveBeenCalledTimes(1);
      expect(unlink).toHaveBeenCalledWith('owner-jwt');
      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(pill()).toHaveAttribute('data-state', 'not_linked');
      expect(screen.getByTestId('form-text-commands-link')).toBeInTheDocument();
      expect(screen.queryByTestId('confirm-text-commands-unlink')).not.toBeInTheDocument();
    });

    it('can back out of unlinking', async () => {
      getStatus.mockResolvedValue(LINKED);
      await renderPage();

      fireEvent.click(screen.getByTestId('btn-text-commands-unlink'));
      fireEvent.click(screen.getByTestId('btn-text-commands-unlink-cancel'));
      await flush();

      expect(unlink).not.toHaveBeenCalled();
      expect(screen.queryByTestId('confirm-text-commands-unlink')).not.toBeInTheDocument();
      expect(screen.getByTestId('btn-text-commands-unlink')).toBeInTheDocument();
      expect(pill()).toHaveAttribute('data-state', 'linked');
    });

    it('marks the unlink button busy while it works', async () => {
      const answer = deferred<{ unlinked: boolean }>();
      getStatus.mockResolvedValueOnce(LINKED);
      getStatus.mockResolvedValue(aStatus());
      unlink.mockReturnValue(answer.promise);
      await renderPage();

      fireEvent.click(screen.getByTestId('btn-text-commands-unlink'));
      fireEvent.click(screen.getByTestId('btn-text-commands-unlink-confirm'));
      await flush();

      const confirm = screen.getByTestId('btn-text-commands-unlink-confirm');
      expect(confirm).toBeDisabled();
      expect(confirm).toHaveAttribute('data-loading', 'true');
      expect(screen.getByTestId('btn-text-commands-unlink-cancel')).toBeDisabled();

      await settle(() => answer.resolve({ unlinked: true }));
      await flush();

      expect(pill()).toHaveAttribute('data-state', 'not_linked');
    });

    it('says so when the phone cannot be unlinked', async () => {
      getStatus.mockResolvedValue(LINKED);
      unlink.mockRejectedValue(new Error('Could not unlink right now.'));
      await renderPage();

      fireEvent.click(screen.getByTestId('btn-text-commands-unlink'));
      fireEvent.click(screen.getByTestId('btn-text-commands-unlink-confirm'));
      await flush();

      expect(screen.getByTestId('error-text-commands-unlink')).toHaveTextContent(
        'Could not unlink right now.'
      );
      expect(pill()).toHaveAttribute('data-state', 'linked');
      expect(getStatus).toHaveBeenCalledTimes(1);
      const confirm = screen.getByTestId('btn-text-commands-unlink-confirm');
      expect(confirm).not.toBeDisabled();
      expect(confirm).toHaveAttribute('data-loading', 'false');
    });
  });

  describe('a phone that stopped', () => {
    it('explains a paused phone and how to turn it back on', async () => {
      getStatus.mockResolvedValue(
        aStatus({
          state: 'paused',
          phoneMasked: '(***) ***-0100',
          verifiedAt: '2026-11-20T15:30:00.000Z',
        })
      );

      await renderPage();

      expect(pill()).toHaveAttribute('data-state', 'paused');
      expect(pill()).toHaveTextContent('Paused');
      const paused = screen.getByTestId('text-commands-paused');
      expect(paused).toHaveTextContent(
        'This phone texted STOP, so commands are paused and FieldView cannot reply.'
      );
      expect(paused).toHaveTextContent('Text START to (877) 343-5308 to turn it back on.');
      expect(screen.getByTestId('text-commands-phone')).toHaveTextContent('(***) ***-0100');
      expect(screen.getByTestId('btn-text-commands-unlink')).toBeInTheDocument();
      expect(screen.queryByTestId('form-text-commands-link')).not.toBeInTheDocument();
      expect(getHistory).not.toHaveBeenCalled();

      await flush(10_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });

    it('can unlink a paused phone', async () => {
      getStatus.mockResolvedValueOnce(aStatus({ state: 'paused', phoneMasked: '(***) ***-0100' }));
      getStatus.mockResolvedValue(aStatus());
      unlink.mockResolvedValue({ unlinked: true });
      await renderPage();

      fireEvent.click(screen.getByTestId('btn-text-commands-unlink'));
      fireEvent.click(screen.getByTestId('btn-text-commands-unlink-confirm'));
      await flush();

      expect(unlink).toHaveBeenCalledWith('owner-jwt');
      expect(pill()).toHaveAttribute('data-state', 'not_linked');
    });

    it('offers to link again when the link ran out, without unlinking', async () => {
      getStatus.mockResolvedValue(aStatus({ state: 'expired', phoneMasked: '(***) ***-0100' }));
      startLink.mockResolvedValue(aStartedLink());
      await renderPage();

      expect(pill()).toHaveAttribute('data-state', 'expired');
      expect(pill()).toHaveTextContent('Expired');
      expect(screen.getByTestId('text-commands-expired')).toHaveTextContent(
        'Link it again to keep using it.'
      );
      expect(screen.queryByTestId('form-text-commands-link')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('btn-text-commands-link-again'));
      await flush();

      expect(unlink).not.toHaveBeenCalled();
      expect(screen.getByTestId('form-text-commands-link')).toBeInTheDocument();

      await askForCode();

      expect(startLink).toHaveBeenCalledTimes(1);
      expect(pill()).toHaveAttribute('data-state', 'waiting');
      expect(screen.getByTestId('text-commands-code')).toHaveTextContent('LINK 482913');
    });
  });
});
