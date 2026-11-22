/**
 * Owner text commands page: the list of phones on a login, adding one and waiting for the
 * LINK text from it, new codes, the two-step remove, and the account's time zone and texts.
 */

import {
  buildOwnerCommandsConsentPlain,
  type CoachTextPhoneCode,
  type CoachTextPhoneStatus,
  type CoachTextStatus,
} from '@fieldview/data-model';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiClient } from '@/lib/api-client';

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

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ApiError: actual.ApiError,
    apiClient: {
      ownerTextCommands: vi.fn(),
      ownerTextCommandsAddPhone: vi.fn(),
      ownerTextCommandsNewCode: vi.fn(),
      ownerTextCommandsRemovePhone: vi.fn(),
      ownerTextCommandsSetTimeZone: vi.fn(),
      ownerTextCommandsHistory: vi.fn(),
    },
  };
});

const getStatus = vi.mocked(apiClient.ownerTextCommands);
const addPhone = vi.mocked(apiClient.ownerTextCommandsAddPhone);
const newCode = vi.mocked(apiClient.ownerTextCommandsNewCode);
const removePhone = vi.mocked(apiClient.ownerTextCommandsRemovePhone);
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
const PRODUCT_NUMBER = '+18773435308';

/** A helper's phone. */
const HELPER = '7d4f2b1e-8c3a-4e5f-9b6d-1a2c3e4f5a6b';
/** The owner's own phone. */
const COACH = '2a9c8e7d-6b5a-4f3e-8d2c-1b0a9f8e7d6c';

function aPhone(overrides: Partial<CoachTextPhoneStatus> = {}): CoachTextPhoneStatus {
  return {
    id: HELPER,
    label: 'Jordan',
    phoneMasked: '(***) ***-0142',
    state: 'pending',
    codeExpiresAt: CODE_EXPIRES,
    verifiedAt: null,
    lastCommandAt: null,
    unverifiedTextSeen: false,
    ...overrides,
  };
}

function aStatus(overrides: Partial<CoachTextStatus> = {}): CoachTextStatus {
  return {
    enabled: true,
    productNumber: PRODUCT_NUMBER,
    timeZone: 'America/Chicago',
    maxPhones: 10,
    phones: [],
    commands: [],
    ...overrides,
  };
}

function withPhones(...phones: CoachTextPhoneStatus[]): CoachTextStatus {
  return aStatus({ phones });
}

/** Jordan's phone, waiting for its LINK text. */
const WAITING = aPhone();

const LINKED = aPhone({
  state: 'linked',
  codeExpiresAt: null,
  // 9:30 in the morning, then 7:04 in the evening, both on Nov 20 in Chicago.
  verifiedAt: '2026-11-20T15:30:00.000Z',
  lastCommandAt: '2026-11-21T01:04:00.000Z',
});

const COACH_LINKED = aPhone({
  id: COACH,
  label: 'Coach',
  phoneMasked: '(***) ***-0100',
  state: 'linked',
  codeExpiresAt: null,
  verifiedAt: '2026-11-19T15:00:00.000Z',
  lastCommandAt: null,
});

function aCode(overrides: Partial<CoachTextPhoneCode> = {}): CoachTextPhoneCode {
  return {
    id: HELPER,
    code: '482913',
    codeExpiresAt: CODE_EXPIRES,
    productNumber: PRODUCT_NUMBER,
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

/** Makes the browser report this time zone. */
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

async function click(testId: string) {
  fireEvent.click(screen.getByTestId(testId));
  await flush();
}

function pill() {
  return screen.getByTestId('status-text-commands');
}

/** The element with this test id for one phone, such as `btn-new-code` for Jordan's. */
function part(prefix: string, id = HELPER) {
  return screen.getByTestId(`${prefix}-${id}`);
}

function queryPart(prefix: string, id = HELPER) {
  return screen.queryByTestId(`${prefix}-${id}`);
}

function rowIds() {
  return screen
    .queryAllByTestId(/^row-text-phone-/)
    .map((row) => row.getAttribute('data-testid')?.replace('row-text-phone-', ''));
}

function fillIn(label: string, phone: string) {
  fireEvent.change(screen.getByTestId('input-phone-label'), { target: { value: label } });
  fireEvent.change(screen.getByTestId('input-phone-number'), { target: { value: phone } });
}

async function addAPhone(label = 'Jordan', phone = '(214) 555-0142') {
  fillIn(label, phone);
  fireEvent.submit(screen.getByTestId('form-add-phone'));
  await flush();
}

/** Opens the page with no phones, adds Jordan's, and leaves it waiting for the text. */
async function startWaiting() {
  getStatus.mockResolvedValueOnce(aStatus());
  getStatus.mockResolvedValue(withPhones(WAITING));
  addPhone.mockResolvedValue(aCode());
  await renderPage();
  await addAPhone();
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
      expect(pill()).toHaveAttribute('data-state', 'on');
      expect(screen.getByTestId('empty-text-phones')).toBeInTheDocument();
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
      expect(screen.queryByTestId('form-add-phone')).not.toBeInTheDocument();
      expect(screen.queryByTestId('list-text-phones')).not.toBeInTheDocument();
      expect(screen.queryByTestId('empty-text-phones')).not.toBeInTheDocument();
      expect(screen.queryByTestId('select-text-commands-timezone')).not.toBeInTheDocument();
      expect(getHistory).not.toHaveBeenCalled();

      await flush(10_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('the list of phones', () => {
    it('invites a first phone when there are none', async () => {
      getStatus.mockResolvedValue(aStatus());

      await renderPage();

      expect(pill()).toHaveAttribute('data-state', 'on');
      expect(pill()).toHaveTextContent('0 of 10 phones');
      expect(screen.getByTestId('empty-text-phones')).toHaveTextContent('No phones yet.');
      expect(screen.queryByTestId('list-text-phones')).not.toBeInTheDocument();
      expect(screen.getByTestId('form-add-phone')).toBeInTheDocument();
      const name = screen.getByTestId('input-phone-label');
      expect(screen.getByLabelText('Name')).toBe(name);
      expect(name).toHaveAttribute('placeholder', 'e.g. Jordan');
      expect(name).toHaveAttribute('maxLength', '40');
      expect(screen.getByLabelText('Mobile number')).toBe(screen.getByTestId('input-phone-number'));
      expect(screen.getByTestId('consent-text-commands')).toHaveTextContent(
        buildOwnerCommandsConsentPlain()
      );
      expect(screen.getByTestId('link-text-commands-terms')).toHaveAttribute('href', '/terms#sms');
      expect(screen.getByTestId('link-text-commands-privacy')).toHaveAttribute('href', '/privacy');
      expect(screen.getByTestId('btn-add-phone')).toHaveTextContent('Get code');
      expect(getHistory).toHaveBeenCalledWith('owner-jwt');

      await flush(10_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });

    it('shows each linked phone with its name, its number, and when it last texted', async () => {
      getStatus.mockResolvedValue(withPhones(COACH_LINKED, LINKED));

      await renderPage();

      expect(rowIds()).toEqual([COACH, HELPER]);
      expect(pill()).toHaveTextContent('2 of 10 phones');
      expect(screen.getByTestId('list-text-phones')).toContainElement(part('row-text-phone'));
      expect(part('text-phone-label')).toHaveTextContent('Jordan');
      expect(part('text-phone-number')).toHaveTextContent('(***) ***-0142');
      expect(part('status-phone')).toHaveAttribute('data-state', 'linked');
      expect(part('status-phone')).toHaveTextContent('Linked');
      expect(part('text-phone-linked-at')).toHaveTextContent('Nov 20, 2026');
      expect(part('text-phone-last-text')).toHaveTextContent(/Nov 20, 7:04\sPM/);
      expect(part('text-phone-label', COACH)).toHaveTextContent('Coach');
      expect(part('text-phone-last-text', COACH)).toHaveTextContent('None yet');
      expect(part('btn-remove-phone')).toHaveTextContent('Remove');
      expect(queryPart('btn-new-code')).not.toBeInTheDocument();
      expect(queryPart('notice-phone-linked')).not.toBeInTheDocument();
      expect(screen.queryByTestId('empty-text-phones')).not.toBeInTheDocument();

      await flush(10_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });

    it('shows times in the time zone of the account, not of the browser', async () => {
      browserIsIn('America/New_York');
      getStatus.mockResolvedValue(aStatus({ phones: [LINKED], timeZone: 'America/Los_Angeles' }));

      await renderPage();

      expect(part('text-phone-last-text')).toHaveTextContent(/Nov 20, 5:04\sPM/);
      expect(screen.getByTestId('select-text-commands-timezone')).toHaveValue(
        'America/Los_Angeles'
      );
    });

    it('explains a paused phone and how to turn it back on', async () => {
      getStatus.mockResolvedValue(
        withPhones(aPhone({ state: 'paused', codeExpiresAt: null, verifiedAt: LINKED.verifiedAt }))
      );

      await renderPage();

      expect(part('status-phone')).toHaveAttribute('data-state', 'paused');
      expect(part('status-phone')).toHaveTextContent('Paused');
      const paused = part('notice-phone-paused');
      expect(paused).toHaveTextContent(
        'This phone texted STOP, so commands are paused and FieldView cannot reply.'
      );
      expect(paused).toHaveTextContent('Text START to (877) 343-5308 to turn it back on.');
      expect(part('btn-remove-phone')).toBeInTheDocument();
      expect(queryPart('btn-new-code')).not.toBeInTheDocument();

      await flush(10_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });

    it('explains a phone that stopped being used, and offers a new code', async () => {
      getStatus.mockResolvedValue(
        withPhones(aPhone({ state: 'expired', codeExpiresAt: null, verifiedAt: LINKED.verifiedAt }))
      );

      await renderPage();

      expect(part('status-phone')).toHaveAttribute('data-state', 'expired');
      expect(part('notice-phone-expired')).toHaveTextContent('Not used for a long time');
      expect(part('btn-new-code')).toHaveTextContent('New code');
      expect(part('btn-remove-phone')).toBeInTheDocument();
    });

    it('shows a waiting phone without its code after a reload, and still watches for the text', async () => {
      getStatus.mockResolvedValue(withPhones(WAITING));

      await renderPage();

      expect(part('status-phone')).toHaveAttribute('data-state', 'waiting');
      expect(part('text-phone-waiting')).toHaveTextContent("Waiting for Jordan's text");
      expect(part('text-phone-code-hidden')).toHaveTextContent('shown only once');
      expect(part('text-phone-countdown')).toHaveTextContent('Code expires in 10:00');
      expect(part('btn-new-code')).toBeInTheDocument();
      expect(queryPart('panel-phone-code')).not.toBeInTheDocument();
      expect(queryPart('link-open-messages')).not.toBeInTheDocument();

      getStatus.mockResolvedValue(withPhones(LINKED));
      await flush(3_000);

      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(part('status-phone')).toHaveAttribute('data-state', 'linked');
      expect(part('notice-phone-linked')).toHaveTextContent("Jordan's phone is linked.");
    });

    it('says the code has expired when the page opens after it ran out', async () => {
      getStatus.mockResolvedValue(
        withPhones(
          aPhone({ codeExpiresAt: '2026-11-21T17:59:59.000Z' }),
          aPhone({ id: COACH, label: 'Coach', codeExpiresAt: null })
        )
      );

      await renderPage();

      for (const id of [HELPER, COACH]) {
        expect(part('status-phone', id)).toHaveAttribute('data-state', 'code_expired');
        expect(part('status-phone', id)).toHaveTextContent('Code expired');
        expect(part('notice-phone-code-expired', id)).toHaveTextContent(
          'That code has expired. Get a new one.'
        );
        expect(part('btn-new-code', id)).toBeInTheDocument();
        expect(queryPart('text-phone-countdown', id)).not.toBeInTheDocument();
      }

      await flush(9_000);
      expect(getStatus).toHaveBeenCalledTimes(1);
    });

    it('says when a text arrived from a waiting phone that could not be verified', async () => {
      getStatus.mockResolvedValue(
        withPhones(
          aPhone({ unverifiedTextSeen: true }),
          aPhone({ ...COACH_LINKED, unverifiedTextSeen: true })
        )
      );

      await renderPage();

      expect(part('notice-phone-unverified')).toHaveTextContent(
        'A text arrived but could not be verified. Send it again.'
      );
      expect(queryPart('notice-phone-unverified', COACH)).not.toBeInTheDocument();
    });

    it('hides the add form once the login has as many phones as it may', async () => {
      getStatus.mockResolvedValue(aStatus({ maxPhones: 2, phones: [COACH_LINKED, LINKED] }));

      await renderPage();

      expect(pill()).toHaveTextContent('2 of 2 phones');
      expect(screen.queryByTestId('form-add-phone')).not.toBeInTheDocument();
      expect(screen.getByTestId('notice-phone-limit')).toHaveTextContent(
        'This login has 2 phones, the most it can have. Remove one to add another.'
      );
    });
  });

  describe('adding a phone', () => {
    it('asks for a code with the name and the number, and shows what to text from that phone', async () => {
      await startWaiting();

      expect(addPhone).toHaveBeenCalledTimes(1);
      expect(addPhone).toHaveBeenCalledWith('owner-jwt', {
        label: 'Jordan',
        phone: '(214) 555-0142',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      expect(rowIds()).toEqual([HELPER]);
      expect(screen.queryByTestId('empty-text-phones')).not.toBeInTheDocument();
      expect(pill()).toHaveTextContent('1 of 10 phones');
      expect(part('status-phone')).toHaveAttribute('data-state', 'waiting');
      expect(part('status-phone')).toHaveTextContent('Waiting');
      expect(part('text-phone-waiting')).toHaveTextContent("Waiting for Jordan's text");
      expect(part('panel-phone-code')).toBeInTheDocument();
      expect(part('text-phone-code')).toHaveTextContent(
        "From Jordan's phone, text LINK 482913 to (877) 343-5308 within 10 minutes."
      );
      expect(part('link-open-messages')).toHaveAttribute(
        'href',
        'sms:+18773435308?&body=LINK%20482913'
      );
      expect(part('link-open-messages')).toHaveTextContent('Open messages on this phone');
      expect(part('hint-open-messages')).toHaveTextContent("Only when this page is open on Jordan's phone.");
      expect(part('text-phone-countdown')).toHaveTextContent('Code expires in 10:00');
      expect(queryPart('text-phone-code-hidden')).not.toBeInTheDocument();
      expect(screen.getByTestId('input-phone-label')).toHaveValue('');
      expect(screen.getByTestId('input-phone-number')).toHaveValue('');
      expect(setTimeZone).not.toHaveBeenCalled();
    });

    it('reads the list again at once, for the new row as the API has it', async () => {
      await startWaiting();

      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(part('text-phone-number')).toHaveTextContent('(***) ***-0142');
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
    });

    it('shows the code even when the list cannot be read right after', async () => {
      getStatus.mockResolvedValueOnce(aStatus());
      getStatus.mockRejectedValueOnce(new Error('offline'));
      getStatus.mockResolvedValue(withPhones(WAITING));
      addPhone.mockResolvedValue(aCode());
      await renderPage();

      await addAPhone();

      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(rowIds()).toEqual([HELPER]);
      expect(part('text-phone-label')).toHaveTextContent('Jordan');
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
      expect(screen.queryByTestId('text-commands-error')).not.toBeInTheDocument();

      await flush(3_000);

      expect(getStatus).toHaveBeenCalledTimes(3);
      expect(part('text-phone-number')).toHaveTextContent('(***) ***-0142');
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
    });

    it('sends what was typed without the spaces around it', async () => {
      getStatus.mockResolvedValue(aStatus());
      addPhone.mockResolvedValue(aCode());
      await renderPage();

      await addAPhone('  Jordan ', ' (214) 555-0142 ');

      expect(addPhone).toHaveBeenCalledWith('owner-jwt', {
        label: 'Jordan',
        phone: '(214) 555-0142',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    });

    it('marks the button busy while the code is on its way, and asks only once', async () => {
      const answer = deferred<CoachTextPhoneCode>();
      getStatus.mockResolvedValue(aStatus());
      addPhone.mockReturnValue(answer.promise);
      await renderPage();

      await addAPhone();

      const button = screen.getByTestId('btn-add-phone');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-loading', 'true');

      fireEvent.submit(screen.getByTestId('form-add-phone'));
      await flush();
      expect(addPhone).toHaveBeenCalledTimes(1);

      getStatus.mockResolvedValue(withPhones(WAITING));
      await settle(() => answer.resolve(aCode()));
      await flush();

      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
      expect(screen.getByTestId('btn-add-phone')).toHaveAttribute('data-loading', 'false');
    });

    it('says so when the number is already on the list, and keeps what was typed', async () => {
      getStatus.mockResolvedValue(aStatus());
      addPhone.mockRejectedValue(
        new ApiError(409, 'PHONE_ALREADY_ADDED', 'That number is already linked here.')
      );
      await renderPage();

      await addAPhone();

      expect(screen.getByTestId('error-add-phone')).toHaveTextContent(
        'This number is already on your list.'
      );
      expect(screen.getByTestId('input-phone-label')).toHaveValue('Jordan');
      expect(screen.getByTestId('input-phone-number')).toHaveValue('(214) 555-0142');
      const button = screen.getByTestId('btn-add-phone');
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('data-loading', 'false');
      expect(rowIds()).toEqual([]);
    });

    it('shows why the API turned the number down', async () => {
      getStatus.mockResolvedValue(aStatus());
      addPhone.mockRejectedValue(
        new ApiError(400, 'BAD_REQUEST', 'Enter a US or Canadian mobile number.')
      );
      await renderPage();

      await addAPhone();

      expect(screen.getByTestId('error-add-phone')).toHaveTextContent(
        'Enter a US or Canadian mobile number.'
      );
    });

    it('gives a plain reason when the failure does not come with one', async () => {
      getStatus.mockResolvedValue(aStatus());
      addPhone.mockRejectedValue('nope');
      await renderPage();

      await addAPhone();

      expect(screen.getByTestId('error-add-phone')).toHaveTextContent(
        'Could not get a code. Try again.'
      );
    });

    it('reads the list again when the login turns out to be full', async () => {
      getStatus.mockResolvedValueOnce(aStatus({ maxPhones: 1 }));
      getStatus.mockResolvedValue(aStatus({ maxPhones: 1, phones: [LINKED] }));
      addPhone.mockRejectedValue(
        new ApiError(409, 'PHONE_LIMIT_REACHED', 'This login has as many phones as it may.')
      );
      await renderPage();

      await addAPhone('Coach', '(214) 555-0100');

      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(rowIds()).toEqual([HELPER]);
      expect(screen.queryByTestId('form-add-phone')).not.toBeInTheDocument();
      expect(screen.getByTestId('notice-phone-limit')).toBeInTheDocument();
    });

    it('does not ask for a code without a name or a number', async () => {
      getStatus.mockResolvedValue(aStatus());
      await renderPage();

      await addAPhone('   ', '(214) 555-0142');
      expect(screen.getByTestId('error-add-phone')).toHaveTextContent('Enter a name.');

      await addAPhone('Jordan', '   ');
      expect(screen.getByTestId('error-add-phone')).toHaveTextContent('Enter a mobile number.');

      expect(addPhone).not.toHaveBeenCalled();
    });

    it('gives a number that is still waiting a fresh code on the same row', async () => {
      getStatus.mockResolvedValueOnce(withPhones(aPhone({ label: 'Camera phone' })));
      getStatus.mockResolvedValue(withPhones(WAITING));
      addPhone.mockResolvedValue(
        aCode({ code: '771204', smsHref: 'sms:+18773435308?&body=LINK%20771204' })
      );
      await renderPage();
      expect(part('text-phone-label')).toHaveTextContent('Camera phone');

      await addAPhone();

      expect(rowIds()).toEqual([HELPER]);
      expect(part('text-phone-label')).toHaveTextContent('Jordan');
      expect(part('text-phone-code')).toHaveTextContent(
        "From Jordan's phone, text LINK 771204 to (877) 343-5308"
      );
    });

    it('keeps the code out of browser storage', async () => {
      await startWaiting();

      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
      expect([...store.keys()]).toEqual(['owner_token']);
      expect([...store.values()].join(' ')).not.toContain('482913');
      expect(sessionStorage.length).toBe(0);
    });
  });

  describe('waiting for the text', () => {
    it('checks every three seconds and stops once the phone is linked', async () => {
      await startWaiting();
      expect(getStatus).toHaveBeenCalledTimes(2);

      await flush(2_999);
      expect(getStatus).toHaveBeenCalledTimes(2);

      await flush(1);
      expect(getStatus).toHaveBeenCalledTimes(3);
      expect(part('status-phone')).toHaveAttribute('data-state', 'waiting');
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');

      getStatus.mockResolvedValue(withPhones(LINKED));
      await flush(3_000);

      expect(getStatus).toHaveBeenCalledTimes(4);
      expect(part('status-phone')).toHaveAttribute('data-state', 'linked');
      expect(part('notice-phone-linked')).toHaveTextContent("Jordan's phone is linked.");
      expect(queryPart('panel-phone-code')).not.toBeInTheDocument();
      expect(queryPart('text-phone-countdown')).not.toBeInTheDocument();

      await flush(30_000);
      expect(getStatus).toHaveBeenCalledTimes(4);
    });

    it('does not pile a second check on one that has not answered', async () => {
      await startWaiting();
      const slow = deferred<CoachTextStatus>();
      getStatus.mockReturnValue(slow.promise);

      await flush(3_000);
      await flush(3_000);
      await flush(3_000);
      expect(getStatus).toHaveBeenCalledTimes(3);

      await settle(() => slow.resolve(withPhones(WAITING)));
      await flush(3_000);
      expect(getStatus).toHaveBeenCalledTimes(4);
    });

    it('keeps waiting when a check fails', async () => {
      await startWaiting();
      getStatus.mockRejectedValue(new Error('offline'));

      await flush(3_000);

      expect(part('status-phone')).toHaveAttribute('data-state', 'waiting');
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
      expect(screen.queryByTestId('text-commands-error')).not.toBeInTheDocument();

      getStatus.mockResolvedValue(withPhones(LINKED));
      await flush(3_000);
      expect(part('status-phone')).toHaveAttribute('data-state', 'linked');
    });

    it('counts the code down', async () => {
      await startWaiting();

      await flush(19_000);

      expect(part('text-phone-countdown')).toHaveTextContent('Code expires in 9:41');
    });

    it('hides the code and stops checking when the code runs out', async () => {
      await startWaiting();

      await flush(10 * 60_000);

      expect(part('status-phone')).toHaveAttribute('data-state', 'code_expired');
      expect(queryPart('panel-phone-code')).not.toBeInTheDocument();
      expect(queryPart('link-open-messages')).not.toBeInTheDocument();
      expect(queryPart('text-phone-countdown')).not.toBeInTheDocument();
      expect(part('notice-phone-code-expired')).toHaveTextContent('That code has expired.');
      expect(part('btn-new-code')).toBeInTheDocument();

      const checks = getStatus.mock.calls.length;
      await flush(30_000);
      expect(getStatus).toHaveBeenCalledTimes(checks);
    });

    it('asks once more as the code runs out, in case the text came while the page slept', async () => {
      await startWaiting();
      expect(getStatus).toHaveBeenCalledTimes(2);

      // The owner was away in the messages app: the clock moved on and no check ran.
      vi.setSystemTime(new Date('2026-11-21T18:11:00.000Z'));
      getStatus.mockResolvedValue(withPhones(LINKED));
      await flush(1_000);

      expect(getStatus).toHaveBeenCalledTimes(3);
      expect(part('status-phone')).toHaveAttribute('data-state', 'linked');
      expect(part('notice-phone-linked')).toBeInTheDocument();
      expect(queryPart('notice-phone-code-expired')).not.toBeInTheDocument();

      await flush(30_000);
      expect(getStatus).toHaveBeenCalledTimes(3);
    });

    it('watches each waiting phone on its own', async () => {
      const coachWaiting = aPhone({ id: COACH, label: 'Coach', phoneMasked: '(***) ***-0100' });
      getStatus.mockResolvedValueOnce(aStatus());
      getStatus.mockResolvedValue(withPhones(coachWaiting));
      addPhone.mockResolvedValue(
        aCode({ id: COACH, code: '305117', smsHref: 'sms:+18773435308?&body=LINK%20305117' })
      );
      await renderPage();
      await addAPhone('Coach', '(214) 555-0100');

      getStatus.mockResolvedValue(withPhones(coachWaiting, WAITING));
      addPhone.mockResolvedValue(aCode());
      await addAPhone();

      expect(rowIds()).toEqual([COACH, HELPER]);
      expect(part('text-phone-code', COACH)).toHaveTextContent(
        "From Coach's phone, text LINK 305117"
      );
      expect(part('text-phone-code')).toHaveTextContent("From Jordan's phone, text LINK 482913");

      getStatus.mockResolvedValue(withPhones({ ...COACH_LINKED, lastCommandAt: null }, WAITING));
      await flush(3_000);

      expect(part('status-phone', COACH)).toHaveAttribute('data-state', 'linked');
      expect(part('notice-phone-linked', COACH)).toHaveTextContent("Coach's phone is linked.");
      expect(queryPart('panel-phone-code', COACH)).not.toBeInTheDocument();
      expect(part('status-phone')).toHaveAttribute('data-state', 'waiting');
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');

      getStatus.mockResolvedValue(withPhones(COACH_LINKED, LINKED));
      await flush(3_000);

      expect(part('status-phone')).toHaveAttribute('data-state', 'linked');
      expect(part('notice-phone-linked')).toBeInTheDocument();
      const checks = getStatus.mock.calls.length;
      await flush(30_000);
      expect(getStatus).toHaveBeenCalledTimes(checks);
    });

    it('lets go of a code when a newer one replaced it somewhere else', async () => {
      await startWaiting();
      getStatus.mockResolvedValue(withPhones(aPhone({ codeExpiresAt: '2026-11-21T18:12:00.000Z' })));

      await flush(3_000);

      expect(queryPart('panel-phone-code')).not.toBeInTheDocument();
      expect(part('text-phone-code-hidden')).toBeInTheDocument();
      expect(part('text-phone-countdown')).toHaveTextContent('Code expires in 11:57');
    });

    it('stops waiting for a phone removed somewhere else', async () => {
      await startWaiting();
      getStatus.mockResolvedValue(aStatus());

      await flush(3_000);

      expect(rowIds()).toEqual([]);
      expect(screen.getByTestId('empty-text-phones')).toBeInTheDocument();
      const checks = getStatus.mock.calls.length;
      await flush(9_000);
      expect(getStatus).toHaveBeenCalledTimes(checks);
    });

    it('does not let a late answer to an old check wipe a new code', async () => {
      getStatus.mockResolvedValueOnce(withPhones(WAITING));
      const oldCheck = deferred<CoachTextStatus>();
      getStatus.mockReturnValue(oldCheck.promise);
      await renderPage();
      await flush(3_000);
      expect(getStatus).toHaveBeenCalledTimes(2);

      const renewedAt = '2026-11-21T18:10:03.000Z';
      newCode.mockResolvedValue(
        aCode({
          code: '771204',
          codeExpiresAt: renewedAt,
          smsHref: 'sms:+18773435308?&body=LINK%20771204',
        })
      );
      await click(`btn-new-code-${HELPER}`);
      expect(part('text-phone-code')).toHaveTextContent('LINK 771204');

      await settle(() => oldCheck.resolve(withPhones(WAITING)));
      await flush();

      expect(part('text-phone-code')).toHaveTextContent('LINK 771204');
      expect(part('status-phone')).toHaveAttribute('data-state', 'waiting');
      expect(part('text-phone-countdown')).toHaveTextContent('Code expires in 10:00');
    });

    it('says when a text arrived that could not be verified', async () => {
      await startWaiting();
      expect(queryPart('notice-phone-unverified')).not.toBeInTheDocument();

      getStatus.mockResolvedValue(withPhones({ ...WAITING, unverifiedTextSeen: true }));
      await flush(3_000);

      expect(part('notice-phone-unverified')).toHaveTextContent(
        'A text arrived but could not be verified. Send it again.'
      );
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
    });

    it('reads the recent texts again once a phone is linked', async () => {
      await startWaiting();
      expect(getHistory).toHaveBeenCalledTimes(1);

      getStatus.mockResolvedValue(withPhones(LINKED));
      await flush(3_000);

      expect(getHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('a new code', () => {
    it('gets a new code for a phone whose code ran out, and watches for the text', async () => {
      getStatus.mockResolvedValue(withPhones(aPhone({ codeExpiresAt: '2026-11-21T17:50:00.000Z' })));
      newCode.mockResolvedValue(aCode());
      await renderPage();

      getStatus.mockResolvedValue(withPhones(WAITING));
      await click(`btn-new-code-${HELPER}`);

      expect(newCode).toHaveBeenCalledTimes(1);
      expect(newCode).toHaveBeenCalledWith('owner-jwt', HELPER);
      expect(part('status-phone')).toHaveAttribute('data-state', 'waiting');
      expect(part('text-phone-code')).toHaveTextContent(
        "From Jordan's phone, text LINK 482913 to (877) 343-5308 within 10 minutes."
      );
      expect(part('text-phone-countdown')).toHaveTextContent('Code expires in 10:00');
      expect(queryPart('notice-phone-code-expired')).not.toBeInTheDocument();

      await flush(3_000);
      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
    });

    it('gets a new code for a phone that stopped being used', async () => {
      getStatus.mockResolvedValue(
        withPhones(aPhone({ state: 'expired', codeExpiresAt: null, verifiedAt: LINKED.verifiedAt }))
      );
      newCode.mockResolvedValue(aCode());
      await renderPage();

      getStatus.mockResolvedValue(withPhones(WAITING));
      await click(`btn-new-code-${HELPER}`);

      expect(part('status-phone')).toHaveAttribute('data-state', 'waiting');
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
      expect(queryPart('notice-phone-expired')).not.toBeInTheDocument();
    });

    it('marks the button busy while the new code is on its way, and asks only once', async () => {
      const answer = deferred<CoachTextPhoneCode>();
      getStatus.mockResolvedValue(withPhones(WAITING));
      newCode.mockReturnValue(answer.promise);
      await renderPage();

      await click(`btn-new-code-${HELPER}`);

      const button = part('btn-new-code');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-loading', 'true');
      await click(`btn-new-code-${HELPER}`);
      expect(newCode).toHaveBeenCalledTimes(1);

      await settle(() => answer.resolve(aCode()));
      await flush();

      expect(part('btn-new-code')).not.toBeDisabled();
      expect(part('btn-new-code')).toHaveAttribute('data-loading', 'false');
      expect(part('text-phone-code')).toHaveTextContent('LINK 482913');
    });

    it('says why a new code could not be had', async () => {
      getStatus.mockResolvedValue(withPhones(WAITING));
      newCode.mockRejectedValue(
        new ApiError(429, 'RATE_LIMIT', 'Too many link codes. Try again in a few minutes.')
      );
      await renderPage();

      await click(`btn-new-code-${HELPER}`);

      expect(part('error-phone')).toHaveTextContent(
        'Too many link codes. Try again in a few minutes.'
      );
      expect(part('btn-new-code')).not.toBeDisabled();
      expect(queryPart('panel-phone-code')).not.toBeInTheDocument();
      expect(getStatus).toHaveBeenCalledTimes(1);
    });

    it('shows the phone as linked when it was linked meanwhile', async () => {
      getStatus.mockResolvedValueOnce(
        withPhones(aPhone({ codeExpiresAt: '2026-11-21T17:50:00.000Z' }))
      );
      getStatus.mockResolvedValue(withPhones(LINKED));
      newCode.mockRejectedValue(
        new ApiError(409, 'PHONE_ALREADY_LINKED', 'That phone is linked already.')
      );
      await renderPage();

      await click(`btn-new-code-${HELPER}`);

      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(part('status-phone')).toHaveAttribute('data-state', 'linked');
      expect(part('error-phone')).toHaveTextContent('This phone is already linked.');
    });

    it('drops a phone that is no longer on the list', async () => {
      getStatus.mockResolvedValueOnce(withPhones(WAITING));
      getStatus.mockResolvedValue(aStatus());
      newCode.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Phone not found'));
      await renderPage();

      await click(`btn-new-code-${HELPER}`);

      expect(getStatus).toHaveBeenCalledTimes(2);
      expect(rowIds()).toEqual([]);
      expect(screen.getByTestId('empty-text-phones')).toBeInTheDocument();
    });
  });

  describe('removing a phone', () => {
    it('asks before removing, then removes only that phone', async () => {
      getStatus.mockResolvedValue(withPhones(COACH_LINKED, LINKED));
      removePhone.mockResolvedValue({ removed: true });
      await renderPage();

      await click(`btn-remove-phone-${HELPER}`);

      expect(removePhone).not.toHaveBeenCalled();
      expect(part('confirm-remove-phone')).toHaveTextContent(
        "Remove Jordan's phone? Texts from it will stop working for this account."
      );
      expect(queryPart('btn-remove-phone')).not.toBeInTheDocument();
      expect(queryPart('confirm-remove-phone', COACH)).not.toBeInTheDocument();

      await click(`btn-confirm-remove-phone-${HELPER}`);

      expect(removePhone).toHaveBeenCalledTimes(1);
      expect(removePhone).toHaveBeenCalledWith('owner-jwt', HELPER);
      expect(rowIds()).toEqual([COACH]);
      expect(pill()).toHaveTextContent('1 of 10 phones');
      expect(getStatus).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('loading-text-commands')).not.toBeInTheDocument();
    });

    it('can back out of removing', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));
      await renderPage();

      await click(`btn-remove-phone-${HELPER}`);
      await click(`btn-cancel-remove-phone-${HELPER}`);

      expect(removePhone).not.toHaveBeenCalled();
      expect(queryPart('confirm-remove-phone')).not.toBeInTheDocument();
      expect(part('btn-remove-phone')).toBeInTheDocument();
      expect(rowIds()).toEqual([HELPER]);
    });

    it('marks the remove button busy while it works', async () => {
      const answer = deferred<{ removed: boolean }>();
      getStatus.mockResolvedValue(withPhones(LINKED));
      removePhone.mockReturnValue(answer.promise);
      await renderPage();

      await click(`btn-remove-phone-${HELPER}`);
      await click(`btn-confirm-remove-phone-${HELPER}`);

      const confirm = part('btn-confirm-remove-phone');
      expect(confirm).toBeDisabled();
      expect(confirm).toHaveAttribute('data-loading', 'true');
      expect(part('btn-cancel-remove-phone')).toBeDisabled();

      await settle(() => answer.resolve({ removed: true }));
      await flush();

      expect(rowIds()).toEqual([]);
    });

    it('says so when the phone cannot be removed, and keeps it', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));
      removePhone.mockRejectedValue(new Error('Could not remove right now.'));
      await renderPage();

      await click(`btn-remove-phone-${HELPER}`);
      await click(`btn-confirm-remove-phone-${HELPER}`);

      expect(part('error-remove-phone')).toHaveTextContent('Could not remove right now.');
      expect(rowIds()).toEqual([HELPER]);
      const confirm = part('btn-confirm-remove-phone');
      expect(confirm).not.toBeDisabled();
      expect(confirm).toHaveAttribute('data-loading', 'false');
    });

    it('takes a phone the API no longer has off the list', async () => {
      getStatus.mockResolvedValue(withPhones(COACH_LINKED, LINKED));
      removePhone.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Phone not found'));
      await renderPage();

      await click(`btn-remove-phone-${HELPER}`);
      await click(`btn-confirm-remove-phone-${HELPER}`);

      expect(rowIds()).toEqual([COACH]);
      expect(queryPart('error-remove-phone')).not.toBeInTheDocument();
    });

    it('shows the empty list once the last phone goes', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));
      removePhone.mockResolvedValue({ removed: true });
      await renderPage();

      await click(`btn-remove-phone-${HELPER}`);
      await click(`btn-confirm-remove-phone-${HELPER}`);

      expect(screen.getByTestId('empty-text-phones')).toBeInTheDocument();
      expect(screen.queryByTestId('list-text-phones')).not.toBeInTheDocument();
    });

    it('brings the add form back once a full login has room again', async () => {
      getStatus.mockResolvedValue(aStatus({ maxPhones: 1, phones: [LINKED] }));
      removePhone.mockResolvedValue({ removed: true });
      await renderPage();
      expect(screen.queryByTestId('form-add-phone')).not.toBeInTheDocument();

      await click(`btn-remove-phone-${HELPER}`);
      await click(`btn-confirm-remove-phone-${HELPER}`);

      expect(screen.getByTestId('form-add-phone')).toBeInTheDocument();
      expect(screen.queryByTestId('notice-phone-limit')).not.toBeInTheDocument();
    });

    it('stops waiting for a phone that was removed', async () => {
      await startWaiting();
      removePhone.mockResolvedValue({ removed: true });

      await click(`btn-remove-phone-${HELPER}`);
      await click(`btn-confirm-remove-phone-${HELPER}`);

      expect(rowIds()).toEqual([]);
      const checks = getStatus.mock.calls.length;
      await flush(9_000);
      expect(getStatus).toHaveBeenCalledTimes(checks);
    });
  });

  describe('the time zone', () => {
    it('shows the time zone of the account, whatever the browser is in', async () => {
      browserIsIn('America/Denver');
      getStatus.mockResolvedValue(aStatus({ timeZone: 'America/Los_Angeles' }));

      await renderPage();

      const select = screen.getByTestId('select-text-commands-timezone');
      expect(screen.getByLabelText('Time zone')).toBe(select);
      expect(select).toHaveValue('America/Los_Angeles');
    });

    it('adds the account time zone to the list when it is not one of the common ones', async () => {
      getStatus.mockResolvedValue(aStatus({ timeZone: 'America/Indiana/Indianapolis' }));

      await renderPage();

      const select = screen.getByTestId('select-text-commands-timezone');
      expect(select).toHaveValue('America/Indiana/Indianapolis');
      expect(
        within(select).getByRole('option', { name: 'America/Indiana/Indianapolis' })
      ).toBeInTheDocument();
    });

    it('saves a new time zone as soon as it is picked', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));
      setTimeZone.mockResolvedValue(aStatus({ phones: [LINKED], timeZone: 'America/New_York' }));
      await renderPage();

      fireEvent.change(screen.getByTestId('select-text-commands-timezone'), {
        target: { value: 'America/New_York' },
      });
      await flush();

      expect(setTimeZone).toHaveBeenCalledTimes(1);
      expect(setTimeZone).toHaveBeenCalledWith('owner-jwt', 'America/New_York');
      expect(screen.getByTestId('select-text-commands-timezone')).toHaveValue('America/New_York');
      expect(part('text-phone-last-text')).toHaveTextContent(/Nov 20, 8:04\sPM/);
      expect(screen.queryByTestId('error-text-commands-timezone')).not.toBeInTheDocument();
    });

    it('marks the time zone busy while it saves', async () => {
      const answer = deferred<CoachTextStatus>();
      getStatus.mockResolvedValue(withPhones(LINKED));
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

      await settle(() => answer.resolve(aStatus({ phones: [LINKED], timeZone: 'America/Denver' })));
      await flush();

      expect(screen.getByTestId('select-text-commands-timezone')).not.toBeDisabled();
      expect(screen.getByTestId('select-text-commands-timezone')).toHaveAttribute(
        'data-loading',
        'false'
      );
    });

    it('puts the time zone back when it cannot be saved', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));
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
      expect(part('text-phone-last-text')).toHaveTextContent(/Nov 20, 7:04\sPM/);
    });
  });

  describe('commands', () => {
    it('says the commands are coming, and which number to text', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));

      await renderPage();

      expect(screen.getByTestId('text-commands-number')).toHaveTextContent('Text (877) 343-5308:');
      expect(screen.getByTestId('text-commands-commands-soon')).toHaveTextContent(
        'Commands arrive with the next update.'
      );
    });

    it('lists the commands once there are some', async () => {
      getStatus.mockResolvedValue(
        aStatus({
          phones: [LINKED],
          commands: [
            { word: 'LIVE', description: 'See which camera streams are live.' },
            { word: 'MENU', description: 'See every command.' },
          ],
        })
      );

      await renderPage();

      const rows = within(screen.getByTestId('list-text-commands-commands')).getAllByRole(
        'listitem'
      );
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('LIVE');
      expect(rows[0]).toHaveTextContent('See which camera streams are live.');
      expect(rows[1]).toHaveTextContent('MENU');
      expect(screen.queryByTestId('text-commands-commands-soon')).not.toBeInTheDocument();
    });
  });

  describe('recent texts', () => {
    it('shows the recent texts with the phone that sent each and what came of it', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));
      getHistory.mockResolvedValue({
        items: [
          {
            createdAt: '2026-11-21T01:04:00.000Z',
            body: 'LINK ******',
            status: 'done',
            replyText: 'Linked. This phone can now run FieldView.Live by text.',
            phoneLabel: 'Jordan',
          },
          {
            createdAt: '2026-11-21T01:03:00.000Z',
            body: 'LINK ******',
            status: 'rejected',
            replyText: null,
            phoneLabel: null,
          },
          {
            createdAt: '2026-11-21T01:02:00.000Z',
            body: 'hello',
            status: 'brand_new_outcome',
            replyText: null,
            phoneLabel: 'Coach',
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
      expect(within(rows[0]).getByTestId('text-history-phone')).toHaveTextContent('Jordan');
      expect(rows[0]).toHaveTextContent('LINK ******');
      expect(rows[0]).toHaveTextContent('Done');
      expect(rows[0]).toHaveTextContent('Linked. This phone can now run FieldView.Live by text.');
      expect(within(rows[1]).queryByTestId('text-history-phone')).not.toBeInTheDocument();
      expect(rows[1]).toHaveTextContent('Not accepted');
      expect(within(rows[2]).getByTestId('text-history-phone')).toHaveTextContent('Coach');
      expect(rows[2]).toHaveTextContent('hello');
      expect(rows[2]).toHaveTextContent('brand new outcome');
      expect(screen.queryByTestId('empty-text-commands-history')).not.toBeInTheDocument();
    });

    it('says so when there are no texts yet', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));
      getHistory.mockResolvedValue({ items: [] });

      await renderPage();

      expect(screen.getByTestId('empty-text-commands-history')).toHaveTextContent('No texts yet.');
      expect(screen.queryByTestId('list-text-commands-history')).not.toBeInTheDocument();
    });

    it('keeps the rest of the page when the recent texts cannot be loaded', async () => {
      getStatus.mockResolvedValue(withPhones(LINKED));
      getHistory.mockRejectedValue(new Error('boom'));

      await renderPage();

      expect(screen.getByTestId('error-text-commands-history')).toHaveTextContent(
        'Recent texts could not be loaded.'
      );
      expect(part('text-phone-number')).toHaveTextContent('(***) ***-0142');
      expect(screen.queryByTestId('text-commands-error')).not.toBeInTheDocument();
    });
  });
});
