/**
 * Coach text commands: emails the login when its phone link changes.
 *
 * A linked phone can change what a stream shows, so the login hears about
 * every link and unlink, with the phone masked and the page to undo it.
 */

import { sendEmail, type EmailOptions } from '../../lib/email';
import { formatNanpForDisplay } from '../../lib/phone';

import { coachTextNumber } from './config';
import type { ICoachTextNotifier } from './interfaces';

type SendEmail = (options: EmailOptions) => Promise<void>;

const SUBJECT_LINKED = 'A phone was linked to your FieldView account';
const SUBJECT_UNLINKED = 'A phone was unlinked from your FieldView account';

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
  constructor(private readonly send: SendEmail = sendEmail) {}

  async linked(input: {
    email: string;
    accountName: string;
    phoneMasked: string;
    paused: boolean;
  }): Promise<void> {
    const paragraphs = [
      `The phone ${input.phoneMasked} was linked to your FieldView login for ${input.accountName}. Texts from it can now run FieldView commands for that account.`,
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
      'If this was not you, unlink the phone here:'
    );
  }

  async movedAway(input: { email: string; phoneMasked: string }): Promise<void> {
    await this.deliver(
      input.email,
      SUBJECT_UNLINKED,
      [
        `The phone ${input.phoneMasked} no longer runs FieldView commands for your login. It was linked to another FieldView login, and a phone works with one login at a time.`,
      ],
      'To link a phone to your login again, go here:'
    );
  }

  async unlinked(input: {
    email: string;
    accountName: string;
    phoneMasked: string;
  }): Promise<void> {
    await this.deliver(
      input.email,
      SUBJECT_UNLINKED,
      [
        `The phone ${input.phoneMasked} was unlinked from your FieldView login for ${input.accountName}. Texts from it no longer run FieldView commands.`,
      ],
      'If this was not you, check your account and link the phone again here:'
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
