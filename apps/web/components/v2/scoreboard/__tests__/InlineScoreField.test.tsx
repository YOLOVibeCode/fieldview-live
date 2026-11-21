import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InlineScoreField } from '../InlineScoreField';

describe('InlineScoreField', () => {
  const commit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    commit.mockResolvedValue(undefined);
  });

  function open() {
    render(
      <InlineScoreField value={1} color="#FFFFFF" commit={commit} aria-label="Edit Sting score" />
    );
    fireEvent.click(screen.getByTestId('btn-inline-score'));
    return screen.getByTestId('input-inline-score') as HTMLInputElement;
  }

  it('focuses the number when tapped', () => {
    const input = open();
    expect(input).toHaveFocus();
    expect(input.value).toBe('1');
  });

  it('commits the typed score on blur', async () => {
    const input = open();
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.blur(input);
    await waitFor(() => expect(commit).toHaveBeenCalledWith(3));
  });

  it('commits the typed score on Enter', async () => {
    const input = open();
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(commit).toHaveBeenCalledWith(4));
  });

  it('restores the old number on Escape and does not commit', () => {
    const input = open();
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(commit).not.toHaveBeenCalled();
    expect(screen.getByTestId('btn-inline-score')).toHaveTextContent('1');
  });

  it('rejects a non-number and does not commit', () => {
    const input = open();
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.blur(input);
    expect(commit).not.toHaveBeenCalled();
    expect(screen.getByTestId('btn-inline-score')).toHaveTextContent('1');
  });
});
