/**
 * Email Provider Factory
 *
 * Creates the appropriate email provider based on environment configuration.
 */

import type { IEmailProvider } from './IEmailProvider';
import { MailpitEmailProvider } from './MailpitEmailProvider';
import { RelayEmailProvider } from './RelayEmailProvider';
import { SendGridEmailProvider } from './SendGridEmailProvider';

let emailProviderInstance: IEmailProvider | null = null;

/**
 * Resolve the email provider.
 *
 * Default is `relay`: all deployed environments route through the Noctusoft
 * relay's `/email/send`, which uses the `X-App-Env` header to decide the
 * destination (dev→Mailpit, uat→tagged, prod→normal). FieldView holds no
 * SendGrid key — the relay injects it.
 *
 * Escape hatches (set `EMAIL_PROVIDER`):
 *   - `mailpit`  — local laptop with no relay access (direct SMTP to Mailpit)
 *   - `sendgrid` — emergency direct SendGrid (requires SENDGRID_API_KEY)
 */
export function getEmailProvider(): IEmailProvider {
  if (emailProviderInstance) {
    return emailProviderInstance;
  }

  const emailProvider = process.env.EMAIL_PROVIDER || 'relay';

  switch (emailProvider.toLowerCase()) {
    case 'sendgrid':
      emailProviderInstance = new SendGridEmailProvider();
      break;
    case 'mailpit':
      emailProviderInstance = new MailpitEmailProvider();
      break;
    case 'relay':
    default:
      emailProviderInstance = new RelayEmailProvider();
      break;
  }

  return emailProviderInstance;
}

export function setEmailProvider(provider: IEmailProvider): void {
  emailProviderInstance = provider;
}

export type { IEmailProvider, EmailOptions } from './IEmailProvider';


