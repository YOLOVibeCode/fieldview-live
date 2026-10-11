/**
 * Carrier reviewers (Twilio toll-free verification, rejection 30482) match the
 * contact email's domain to the operator, so every public policy page and the
 * site footer name Noctusoft, Inc. as the operator.
 */
import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PublicLegalFooter } from '@/components/PublicLegalFooter';

import HomePage from '../page';
import PrivacyPage from '../privacy/page';
import SmsOptInPage from '../sms/page';
import TermsPage from '../terms/page';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/SmsOptInPageForm', () => ({
  SmsOptInPageForm: () => <form data-testid="form-sms-opt-in" />,
}));

const OPERATED_BY = 'FieldView.Live is operated by Noctusoft, Inc. (https://noctusoft.com)';

function expectOperatedBy(container: HTMLElement): void {
  const line = container.querySelector('[data-testid="text-operated-by"]');
  expect(line).not.toBeNull();
  expect(line).toHaveTextContent(OPERATED_BY);
  expect(line?.querySelector('a')).toHaveAttribute('href', 'https://noctusoft.com');
}

describe('operated by Noctusoft, Inc.', () => {
  it('is in the site footer', () => {
    render(<PublicLegalFooter />);
    expectOperatedBy(screen.getByTestId('footer-public-legal'));
  });

  it('is in the home page business section', () => {
    render(<HomePage />);
    expectOperatedBy(screen.getByTestId('section-about-business'));
  });

  it.each([
    ['privacy', PrivacyPage, 'page-privacy'],
    ['terms', TermsPage, 'page-terms'],
    ['sms', SmsOptInPage, 'page-sms'],
  ])('is near the top of /%s', (_name, Page, testId) => {
    render(<Page />);
    const page = screen.getByTestId(testId);
    expectOperatedBy(page);
    // Right under the page heading, before the body copy.
    const heading = page.querySelector('h1');
    expect(heading?.nextElementSibling).toHaveAttribute('data-testid', 'text-operated-by');
  });
});
