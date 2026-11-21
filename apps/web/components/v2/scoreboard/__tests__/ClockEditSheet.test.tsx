import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ClockEditSheet } from '../ClockEditSheet';

describe('ClockEditSheet', () => {
  const onSave = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSave.mockResolvedValue(undefined);
  });

  it('opens on the current match time', () => {
    render(
      <ClockEditSheet isOpen currentTime="18:40" onSave={onSave} onClose={onClose} />
    );
    expect(screen.getByTestId('input-clock-minutes')).toHaveValue(18);
    expect(screen.getByTestId('input-clock-seconds')).toHaveValue(40);
  });

  it('steps minutes and ten-second chunks', () => {
    render(
      <ClockEditSheet isOpen currentTime="18:40" onSave={onSave} onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId('btn-clock-plus-minute'));
    fireEvent.click(screen.getByTestId('btn-clock-plus-ten'));
    expect(screen.getByTestId('input-clock-minutes')).toHaveValue(19);
    expect(screen.getByTestId('input-clock-seconds')).toHaveValue(50);
  });

  it('saves total seconds for the linesman time', async () => {
    render(
      <ClockEditSheet isOpen currentTime="00:00" onSave={onSave} onClose={onClose} />
    );
    fireEvent.change(screen.getByTestId('input-clock-minutes'), { target: { value: '22' } });
    fireEvent.change(screen.getByTestId('input-clock-seconds'), { target: { value: '15' } });
    fireEvent.click(screen.getByTestId('btn-set-clock'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(22 * 60 + 15));
  });
});
