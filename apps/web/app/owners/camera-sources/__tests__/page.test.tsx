import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    ownerCameraSources: vi.fn(),
    ownerCameraSourceConnect: vi.fn(),
    ownerCameraSourceDisconnect: vi.fn(),
  },
}));

import { apiClient, type CameraProviderInfo } from '@/lib/api-client';

import OwnerCameraSourcesPage from '../page';

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

const CLUB_URL = 'https://app.veo.co/clubs/diablos/';

const veo = (over: Partial<CameraProviderInfo> = {}): CameraProviderInfo => ({
  id: 'veo',
  displayName: 'Veo',
  connectFields: [
    { name: 'email', label: 'Veo login email', type: 'email', placeholder: 'coach@example.com' },
    { name: 'clubUrl', label: 'Veo club page', type: 'url', help: 'Open your club in Veo and copy the address.' },
    { name: 'password', label: 'Veo password', type: 'password', help: 'Used once to sign in.' },
  ],
  connection: null,
  ...over,
});

const connected = (status: 'active' | 'needs_reconnect' = 'active') =>
  veo({ connection: { status, config: { email: 'coach@example.com', clubUrl: CLUB_URL } } });

const list = apiClient.ownerCameraSources as ReturnType<typeof vi.fn>;
const connect = apiClient.ownerCameraSourceConnect as ReturnType<typeof vi.fn>;
const disconnect = apiClient.ownerCameraSourceDisconnect as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  localStorage.setItem('owner_token', 'owner-jwt');
  list.mockResolvedValue({ providers: [veo()] });
});

async function renderPage() {
  render(<OwnerCameraSourcesPage />);
  await waitFor(() => expect(screen.getByTestId('card-provider-veo')).toBeInTheDocument());
}

describe('Owner streaming providers page', () => {
  it('sends a signed-out owner to the login page without calling the API', async () => {
    localStorage.removeItem('owner_token');

    render(<OwnerCameraSourcesPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/owners/login'));
    expect(list).not.toHaveBeenCalled();
  });

  it('shows each provider as not connected, with the form the API describes', async () => {
    await renderPage();

    expect(list).toHaveBeenCalledWith('owner-jwt');
    expect(screen.getByTestId('status-provider-veo')).toHaveTextContent('Not connected');
    expect(screen.getByLabelText('Veo login email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Veo club page')).toHaveAttribute('type', 'url');
    expect(screen.getByLabelText('Veo password')).toHaveAttribute('type', 'password');
    expect(screen.getByText('Used once to sign in.')).toBeInTheDocument();
    expect(screen.getByTestId('btn-connect-veo')).toHaveTextContent('Connect Veo');
    expect(screen.queryByTestId('btn-disconnect-veo')).not.toBeInTheDocument();
  });

  it('connects with what the owner typed, then shows it connected and forgets the password', async () => {
    connect.mockResolvedValue({ id: 'veo', displayName: 'Veo', connection: connected().connection });
    const user = userEvent.setup();
    await renderPage();

    await user.type(screen.getByLabelText('Veo login email'), 'coach@example.com');
    await user.type(screen.getByLabelText('Veo club page'), CLUB_URL);
    await user.type(screen.getByLabelText('Veo password'), 'hunter2');
    await user.click(screen.getByTestId('btn-connect-veo'));

    await waitFor(() => expect(screen.getByTestId('status-provider-veo')).toHaveTextContent('Connected'));
    expect(connect).toHaveBeenCalledWith('owner-jwt', 'veo', {
      email: 'coach@example.com',
      clubUrl: CLUB_URL,
      password: 'hunter2',
    });
    expect(screen.getByTestId('notice-connected-veo')).toBeInTheDocument();
    expect(screen.getByLabelText('Veo password')).toHaveValue('');
    expect(screen.getByLabelText('Veo login email')).toHaveValue('coach@example.com');
  });

  it('shows why a connection failed and keeps what was typed, except the password', async () => {
    connect.mockRejectedValue(new Error('Veo did not accept that email or password'));
    const user = userEvent.setup();
    await renderPage();

    await user.type(screen.getByLabelText('Veo login email'), 'coach@example.com');
    await user.type(screen.getByLabelText('Veo club page'), CLUB_URL);
    await user.type(screen.getByLabelText('Veo password'), 'wrong');
    await user.click(screen.getByTestId('btn-connect-veo'));

    await waitFor(() =>
      expect(screen.getByTestId('error-connect-veo')).toHaveTextContent('Veo did not accept that email or password')
    );
    expect(screen.getByTestId('status-provider-veo')).toHaveTextContent('Not connected');
    expect(screen.getByLabelText('Veo login email')).toHaveValue('coach@example.com');
    expect(screen.getByLabelText('Veo password')).toHaveValue('');
  });

  it('marks the button busy while connecting', async () => {
    let finish: (value: unknown) => void = () => {};
    connect.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    await renderPage();

    await user.type(screen.getByLabelText('Veo login email'), 'coach@example.com');
    await user.type(screen.getByLabelText('Veo club page'), CLUB_URL);
    await user.type(screen.getByLabelText('Veo password'), 'hunter2');
    await user.click(screen.getByTestId('btn-connect-veo'));

    expect(screen.getByTestId('btn-connect-veo')).toBeDisabled();
    expect(screen.getByTestId('btn-connect-veo')).toHaveAttribute('data-loading', 'true');

    finish({ id: 'veo', displayName: 'Veo', connection: connected().connection });
    await waitFor(() => expect(screen.getByTestId('btn-connect-veo')).toHaveAttribute('data-loading', 'false'));
  });

  it('shows a connected provider with its settings filled in and the password blank', async () => {
    list.mockResolvedValue({ providers: [connected()] });

    await renderPage();

    expect(screen.getByTestId('status-provider-veo')).toHaveTextContent('Connected');
    expect(screen.getByLabelText('Veo login email')).toHaveValue('coach@example.com');
    expect(screen.getByLabelText('Veo club page')).toHaveValue(CLUB_URL);
    expect(screen.getByLabelText('Veo password')).toHaveValue('');
    expect(screen.getByTestId('btn-connect-veo')).toHaveTextContent('Reconnect Veo');
  });

  it('says clearly when a provider needs reconnecting', async () => {
    list.mockResolvedValue({ providers: [connected('needs_reconnect')] });

    await renderPage();

    expect(screen.getByTestId('status-provider-veo')).toHaveTextContent('Needs reconnecting');
    expect(screen.getByTestId('notice-reconnect-veo')).toBeInTheDocument();
  });

  it('asks before disconnecting, then disconnects', async () => {
    list.mockResolvedValue({ providers: [connected()] });
    disconnect.mockResolvedValue({ disconnected: true });
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('btn-disconnect-veo'));
    expect(disconnect).not.toHaveBeenCalled();

    await user.click(within(screen.getByTestId('confirm-disconnect-veo')).getByTestId('btn-confirm-disconnect-veo'));

    await waitFor(() => expect(screen.getByTestId('status-provider-veo')).toHaveTextContent('Not connected'));
    expect(disconnect).toHaveBeenCalledWith('owner-jwt', 'veo');
    expect(screen.getByLabelText('Veo login email')).toHaveValue('');
  });

  it('can back out of disconnecting', async () => {
    list.mockResolvedValue({ providers: [connected()] });
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('btn-disconnect-veo'));
    await user.click(screen.getByTestId('btn-cancel-disconnect-veo'));

    expect(disconnect).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-disconnect-veo')).not.toBeInTheDocument();
    expect(screen.getByTestId('status-provider-veo')).toHaveTextContent('Connected');
  });

  it('shows an error when the list cannot be loaded', async () => {
    list.mockRejectedValue(new Error('Network down'));

    render(<OwnerCameraSourcesPage />);

    await waitFor(() => expect(screen.getByTestId('camera-sources-error')).toHaveTextContent('Network down'));
  });

  it('says so when no provider is supported yet', async () => {
    list.mockResolvedValue({ providers: [] });

    render(<OwnerCameraSourcesPage />);

    await waitFor(() => expect(screen.getByTestId('empty-providers')).toBeInTheDocument());
  });
});
