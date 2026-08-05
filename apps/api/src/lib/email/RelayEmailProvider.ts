/**
 * Relay Email Provider
 *
 * The single email path for deployed FieldView. Instead of talking to SendGrid
 * directly, every email is POSTed to the Noctusoft relay's native `/email/send`
 * with an `X-App-Env` header. The *relay* owns the destination decision:
 *
 *   dev  → captured in Mailpit (never delivered)
 *   uat  → delivered, but subject prefixed "[UAT] " + an env banner in the body
 *   prod → delivered normally
 *
 * FieldView therefore holds no SendGrid credential — the relay injects it. Every
 * call site keeps the same `IEmailProvider.sendEmail(...)` interface; the
 * environment transparently decides where the mail goes.
 */

import { resolveServerEnv } from '../env';

import type { IEmailProvider, EmailOptions } from './IEmailProvider';

const RELAY_BASE_URL = (process.env.NOCTUSOFT_RELAY_BASE_URL || '').replace(/\/+$/, '');
const RELAY_API_KEY = process.env.NOCTUSOFT_API_KEY || '';
const FROM_EMAIL =
  process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'noreply@fieldview.live';

export class RelayEmailProvider implements IEmailProvider {
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!RELAY_BASE_URL) {
      throw new Error('NOCTUSOFT_RELAY_BASE_URL is not configured');
    }
    if (!RELAY_API_KEY) {
      throw new Error('NOCTUSOFT_API_KEY is not configured');
    }

    const appEnv = resolveServerEnv();

    let res: Response;
    try {
      res = await fetch(`${RELAY_BASE_URL}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RELAY_API_KEY}`,
          // The environment router — the relay reads this to pick Mailpit / tag / send.
          'X-App-Env': appEnv,
        },
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          html: options.html || undefined,
          text: options.text || undefined,
          from: options.from || FROM_EMAIL,
        }),
      });
    } catch (error) {
      // Network / DNS failure reaching the relay.
      throw new Error(
        `Relay email request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (res.status < 200 || res.status >= 300) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Relay email failed (${res.status}): ${detail.slice(0, 300)}`);
    }
  }
}
