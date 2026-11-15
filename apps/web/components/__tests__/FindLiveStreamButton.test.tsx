/**
 * FindLiveStreamButton Component Tests
 *
 * Asks the API what is live on the owner's streaming providers and hands the
 * chosen stream URL back to the admin panel. One result is taken automatically.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { FindLiveStreamButton } from '../FindLiveStreamButton';

const VEO_OK = { provider: 'veo', displayName: 'Veo', status: 'ok' };

function stream(title: string, id: string) {
  return { provider: 'veo', providerName: 'Veo', title, streamUrl: `https://stream.mux.com/${id}.m3u8` };
}

function respond(body: unknown): void {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });
}

function renderButton(slug = 'diablos') {
  const onPick = vi.fn();
  render(<FindLiveStreamButton slug={slug} adminToken="jwt-123" onPick={onPick} />);
  return { onPick };
}

describe('FindLiveStreamButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('takes the stream automatically when exactly one is live', async () => {
    respond({ streams: [stream('Diablos vs Storm', 'LIVE1')], sources: [VEO_OK] });
    const { onPick } = renderButton();

    fireEvent.click(screen.getByTestId('btn-find-live-stream'));

    await waitFor(() => expect(onPick).toHaveBeenCalledWith('https://stream.mux.com/LIVE1.m3u8'));
    expect(screen.getByTestId('live-stream-picked')).toHaveTextContent('Diablos vs Storm');
    expect(screen.getByTestId('live-stream-picked')).toHaveTextContent('Veo');
    expect(screen.getByTestId('live-stream-picked')).toHaveTextContent(/save/i);
  });

  it('calls the search endpoint for this page with the admin token', async () => {
    respond({ streams: [], sources: [VEO_OK] });
    renderButton('Diablos/soccer-20261115');

    fireEvent.click(screen.getByTestId('btn-find-live-stream'));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/direct\/diablos%2Fsoccer-20261115\/live-streams$/);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('lists the streams when several are live and takes the one the admin picks', async () => {
    respond({
      streams: [stream('Diablos vs Storm', 'LIVE1'), stream('Rovers vs United', 'LIVE2')],
      sources: [VEO_OK],
    });
    const { onPick } = renderButton();

    fireEvent.click(screen.getByTestId('btn-find-live-stream'));

    await waitFor(() => expect(screen.getByTestId('list-live-streams')).toBeInTheDocument());
    expect(onPick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Rovers vs United/ }));

    expect(onPick).toHaveBeenCalledWith('https://stream.mux.com/LIVE2.m3u8');
    expect(screen.getByTestId('live-stream-picked')).toHaveTextContent('Rovers vs United');
    expect(screen.queryByTestId('list-live-streams')).not.toBeInTheDocument();
  });

  it('says so when nothing is live', async () => {
    respond({ streams: [], sources: [VEO_OK] });
    const { onPick } = renderButton();

    fireEvent.click(screen.getByTestId('btn-find-live-stream'));

    await waitFor(() => expect(screen.getByTestId('empty-live-streams')).toHaveTextContent(/nothing is live on Veo/i));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('says so when no streaming provider is connected', async () => {
    respond({ streams: [], sources: [] });
    renderButton();

    fireEvent.click(screen.getByTestId('btn-find-live-stream'));

    await waitFor(() =>
      expect(screen.getByTestId('empty-live-streams')).toHaveTextContent(/no streaming provider is connected/i)
    );
  });

  it('tells the admin when a provider needs to be reconnected', async () => {
    respond({ streams: [], sources: [{ provider: 'veo', displayName: 'Veo', status: 'needs_reconnect' }] });
    renderButton();

    fireEvent.click(screen.getByTestId('btn-find-live-stream'));

    await waitFor(() => expect(screen.getByTestId('error-live-streams')).toHaveTextContent(/Veo needs to be reconnected/i));
  });

  it('tells the admin when a provider could not be reached', async () => {
    respond({ streams: [], sources: [{ provider: 'veo', displayName: 'Veo', status: 'error' }] });
    renderButton();

    fireEvent.click(screen.getByTestId('btn-find-live-stream'));

    await waitFor(() => expect(screen.getByTestId('error-live-streams')).toHaveTextContent(/could not reach Veo/i));
  });

  it('shows the API’s message when the search request fails', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { code: 'RATE_LIMIT', message: 'Too many live stream searches' } }),
    });
    const { onPick } = renderButton();

    fireEvent.click(screen.getByTestId('btn-find-live-stream'));

    await waitFor(() =>
      expect(screen.getByTestId('error-live-streams')).toHaveTextContent('Too many live stream searches')
    );
    expect(onPick).not.toHaveBeenCalled();
  });

  it('is disabled and marked loading while the search is running', async () => {
    let finish: (value: unknown) => void = () => {};
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    renderButton();
    const button = screen.getByTestId('btn-find-live-stream');

    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute('data-loading', 'true'));
    expect(button).toBeDisabled();

    finish({ ok: true, json: () => Promise.resolve({ streams: [], sources: [VEO_OK] }) });
    await waitFor(() => expect(button).toHaveAttribute('data-loading', 'false'));
    expect(button).not.toBeDisabled();
  });
});
