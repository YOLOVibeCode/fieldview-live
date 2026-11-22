/**
 * Coach text commands: emails the login when its phone list changes.
 *
 * A linked phone can change what a stream shows, so the login hears about
 * every phone that links and every phone removed, with the person's name, the
 * number masked and the page to undo it.
 */

import { sendEmail, type EmailOptions } from '../../lib/email';
import { formatNanpForDisplay } from '../../lib/phone';

import { coachTextNumber } from './config';
import type { ICoachTextNotifier } from './interfaces';

type SendEmail = (options: EmailOptions) => Promise<void>;

const SUBJECT_LINKED = 'A phone was linked to your FieldView account';
const SUBJECT_REMOVED = 'A phone was removed from your FieldView account';

function portalUrl(): string {
  const appUrl = (process.env.APP_URL || 'https://fieldview.live').replace(/\/$/, '');
  return `${appUrl}/owners/text-commands`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class EmailLinkNotifier implements ICoachTextNotifier {
  constructor(private readonly send: SendEmail = (options) => sendEmail(options)) {}

  async linked(input: {
    email: string;
    accountName: string;
    label: string;
    phoneMasked: string;
    paused: boolean;
  }): Promise<void> {
    const paragraphs = [
      `${input.label}'s phone ${input.phoneMasked} was linked to your FieldView login for ${input.accountName}. Texts from it can now run FieldView commands for that account.`,
    ];
    if (input.paused) {
      const number = formatNanpForDisplay(coachTextNumber());
      paragraphs.push(
        `That phone texted STOP earlier, so commands are paused and FieldView cannot reply to it. To turn them on, text START to ${number} from that phone.`
      );
    }
    await this.deliver(
      input.email,
      SUBJECT_LINKED,
      paragraphs,
      'If this was not you, remove the phone here:'
    );
  }

  async removed(input: {
    email: string;
    accountName: string;
    label: string;
    phoneMasked: string;
  }): Promise<void> {
    await this.deliver(
      input.email,
      SUBJECT_REMOVED,
      [
        `${input.label}'s phone ${input.phoneMasked} was removed from your FieldView login for ${input.accountName}. Texts from it no longer run FieldView commands for that account.`,
      ],
      'If this was not you, check your account and add the phone again here:'
    );
  }

  private async deliver(
    to: string,
    subject: string,
    paragraphs: string[],
    closing: string
  ): Promise<void> {
    const url = portalUrl();
    const text = [...paragraphs, `${closing}\n${url}`].join('\n\n');
    const html = [
      ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
      `<p>${escapeHtml(closing)}<br><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`,
    ].join('\n');
    await this.send({ to, subject, text, html });
  }
}
