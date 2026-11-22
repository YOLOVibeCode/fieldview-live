/**
 * Coach sign-in page: a coach who forgot the password can get a reset link.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OwnerLoginPage from '../page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('OwnerLoginPage', () => {
  it('links to the password reset page', () => {
    render(<OwnerLoginPage />);

    expect(screen.getByTestId('link-forgot-password')).toHaveAttribute('href', '/forgot-password');
  });

  it('still links to registration', () => {
    render(<OwnerLoginPage />);

    expect(screen.getByTestId('link-register')).toHaveAttribute('href', '/owners/register');
  });
});
