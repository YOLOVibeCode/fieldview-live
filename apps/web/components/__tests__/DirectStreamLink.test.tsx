/**
 * A game page's link: the address viewers open, in full, with a button that copies it.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DirectStreamLink } from '../DirectStreamLink';

const writeText = vi.fn<[string], Promise<void>>();

function setClipboard(clipboard: { writeText: typeof writeText } | undefined) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
}

const PAGE_URL = `${window.location.origin}/direct/tigers-vs-hawks`;

/** jsdom cannot open new tabs; stop it trying when a test clicks a link. */
function blockNavigation(event: Event) {
  event.preventDefault();
}

/** Clicks, and lets the copy the click started finish. */
async function clickAndSettle(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
    await Promise.resolve();
  });
}

describe('DirectStreamLink', () => {
  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    setClipboard({ writeText });
    document.addEventListener('click', blockNavigation, { capture: true });
  });

  afterEach(() => {
    document.removeEventListener('click', blockNavigation, { capture: true });
    vi.useRealTimers();
  });

  it('shows the address viewers open, on the site the coach is using', () => {
    render(<DirectStreamLink slug="tigers-vs-hawks" />);

    const link = screen.getByTestId('link-direct-tigers-vs-hawks');
    expect(link).toHaveAttribute('href', PAGE_URL);
    expect(link).toHaveTextContent(`${window.location.host}/direct/tigers-vs-hawks`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('copies the whole address and says so', async () => {
    render(<DirectStreamLink slug="tigers-vs-hawks" />);
    const button = screen.getByTestId('btn-copy-link-tigers-vs-hawks');
    expect(button).toHaveTextContent('Copy link');

    await clickAndSettle(button);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(PAGE_URL);
    expect(button).toHaveTextContent('Copied');
    expect(screen.getByRole('status')).toHaveTextContent('Link copied');
  });

  it('goes back to Copy link after a moment', async () => {
    vi.useFakeTimers();
    render(<DirectStreamLink slug="tigers-vs-hawks" />);
    const button = screen.getByTestId('btn-copy-link-tigers-vs-hawks');

    await clickAndSettle(button);
    expect(button).toHaveTextContent('Copied');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button).toHaveTextContent('Copy link');
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('says so when the browser refuses to copy', async () => {
    writeText.mockRejectedValue(new Error('NotAllowedError'));
    render(<DirectStreamLink slug="tigers-vs-hawks" />);
    const button = screen.getByTestId('btn-copy-link-tigers-vs-hawks');

    await clickAndSettle(button);

    expect(button).toHaveTextContent('Copy failed');
    expect(screen.getByRole('status')).toHaveTextContent('Select the link to copy it');
  });

  it('says so when the browser has no clipboard', async () => {
    setClipboard(undefined);
    render(<DirectStreamLink slug="tigers-vs-hawks" />);
    const button = screen.getByTestId('btn-copy-link-tigers-vs-hawks');

    await clickAndSettle(button);

    expect(button).toHaveTextContent('Copy failed');
  });

  it('leaves the row it sits in alone', async () => {
    const onRowClick = vi.fn();
    render(
      <div onClick={onRowClick}>
        <DirectStreamLink slug="tigers-vs-hawks" />
      </div>
    );

    await clickAndSettle(screen.getByTestId('btn-copy-link-tigers-vs-hawks'));
    fireEvent.click(screen.getByTestId('link-direct-tigers-vs-hawks'));

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('can show the link without the button', () => {
    render(<DirectStreamLink slug="old-game" copyable={false} />);

    expect(screen.getByTestId('link-direct-old-game')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-copy-link-old-game')).not.toBeInTheDocument();
  });
});
