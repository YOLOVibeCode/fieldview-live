/**
 * Email Provider Factory
 *
 * Creates the appropriate email provider based on environment configuration.
 */

import type { IEmailProvider } from './IEmailProvider';
import { MailpitEmailProvider } from './MailpitEmailProvider';
import { SendGridEmailProvider } from './SendGridEmailProvider';

let emailProviderInstance: IEmailProvider | null = null;

export function getEmailProvider(): IEmailProvider {
  if (emailProviderInstance) {
    return emailProviderInstance;
  }

  const emailProvider = process.env.EMAIL_PROVIDER || 'mailpit';

  switch (emailProvider.toLowerCase()) {
    case 'sendgrid':
      emailProviderInstance = new SendGridEmailProvider();
      break;
    case 'mailpit':
    default:
      emailProviderInstance = new MailpitEmailProvider();
      break;
  }

  return emailProviderInstance;
}

export function setEmailProvider(provider: IEmailProvider): void {
  emailProviderInstance = provider;
}

export type { IEmailProvider, EmailOptions } from './IEmailProvider';


