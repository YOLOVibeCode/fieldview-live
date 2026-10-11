/**
 * Home page must be fully public: carrier reviewers (Twilio toll-free
 * verification) read it without logging in, so it names the business and a
 * contact, and no popup covers it.
 */
import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import HomePage from '../page';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('HomePage', () => {
  it('shows no coming-soon popup', () => {
    render(<HomePage />);

    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/launch date/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the business and a support contact', () => {
    render(<HomePage />);

    const about = screen.getByTestId('section-about-business');
    expect(about).toHaveTextContent('Noctusoft, Inc.');
    expect(about).toHaveTextContent('support@fieldview.live');
    expect(screen.getByTestId('link-about-support-email')).toHaveAttribute(
      'href',
      'mailto:support@fieldview.live'
    );
  });

  it('links to text messages, privacy and terms from the page body', () => {
    render(<HomePage />);

    expect(screen.getByTestId('link-about-sms')).toHaveAttribute('href', '/sms');
    expect(screen.getByTestId('link-about-privacy')).toHaveAttribute('href', '/privacy');
    expect(screen.getByTestId('link-about-terms')).toHaveAttribute('href', '/terms');
  });

  it('keeps owner login and get started', () => {
    render(<HomePage />);

    expect(screen.getByTestId('link-owner-login')).toHaveAttribute('href', '/owners/login');
    expect(screen.getByTestId('link-owner-register')).toHaveAttribute('href', '/owners/register');
  });
});
