import { describe, expect, it } from 'vitest';

import { replies } from '../reply/replies';
import {
  SMS_HARD_LIMIT,
  SMS_TARGET_LENGTH,
  cutToSmsLength,
  emptyTwiml,
  escapeXml,
  smsLength,
  toGsm7,
  twimlMessage,
} from '../reply/twiml';

/** An `&` that does not start one of the five XML entities. */
const BARE_AMPERSAND = /&(?!(?:amp|lt|gt|quot|apos);)/;

function messageContent(twiml: string): string {
  const match = /^<Response><Message>([\s\S]*)<\/Message><\/Response>$/.exec(twiml);
  if (!match) {
    throw new Error(`not a message reply: ${twiml}`);
  }
  return match[1];
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

describe('escapeXml', () => {
  it('escapes the five XML characters', () => {
    expect(escapeXml(`A & B <tag> "q" 'a'`)).toBe(
      'A &amp; B &lt;tag&gt; &quot;q&quot; &apos;a&apos;'
    );
  });

  it('escapes an ampersand that already looks like an entity', () => {
    expect(escapeXml('&amp;')).toBe('&amp;amp;');
  });
});

describe('toGsm7', () => {
  it('maps curly quotes, dashes and the ellipsis to plain characters', () => {
    expect(toGsm7('“Hi” – it’s… ok — yes')).toBe('"Hi" - it\'s... ok - yes');
  });

  it('drops emoji and characters with no plain form', () => {
    expect(toGsm7('Go ⚽ team 🎉')).toBe('Go team');
    expect(toGsm7('日本 FC')).toBe('FC');
  });

  it('keeps accents the text alphabet has and strips the others', () => {
    expect(toGsm7('Peña café')).toBe('Peña café');
    expect(toGsm7('Győr Čech')).toBe('Gyor Cech');
  });

  it('maps tabs, non-breaking spaces and backticks', () => {
    expect(toGsm7('a\tb\u00a0c`d')).toBe("a b c'd");
  });
});

describe('smsLength', () => {
  it('counts plain characters once and extension characters twice', () => {
    expect(smsLength('abc')).toBe(3);
    expect(smsLength('a[b]')).toBe(6);
  });
});

describe('cutToSmsLength', () => {
  it('leaves a short text alone', () => {
    expect(cutToSmsLength('Hello there.')).toBe('Hello there.');
  });

  it('cuts at three segments and marks the cut', () => {
    const cut = cutToSmsLength('a'.repeat(600));
    expect(smsLength(cut)).toBe(SMS_HARD_LIMIT);
    expect(cut.endsWith('...')).toBe(true);
  });

  it('counts extension characters when cutting', () => {
    const cut = cutToSmsLength('['.repeat(400));
    expect(smsLength(cut)).toBeLessThanOrEqual(SMS_HARD_LIMIT);
    expect(cut.endsWith('...')).toBe(true);
  });
});

describe('twimlMessage', () => {
  it('wraps and escapes the text', () => {
    expect(twimlMessage('A & B <ok>')).toBe(
      '<Response><Message>A &amp; B &lt;ok&gt;</Message></Response>'
    );
  });

  it('never cuts an entity in half', () => {
    const content = messageContent(twimlMessage('a'.repeat(455) + '&'.repeat(40)));
    expect(BARE_AMPERSAND.test(content)).toBe(false);
    expect(content.endsWith('...')).toBe(true);
    expect(smsLength(unescapeXml(content))).toBeLessThanOrEqual(SMS_HARD_LIMIT);
  });

  it('sends plain characters only', () => {
    const content = messageContent(twimlMessage('“Done” 🎉 — see you…'));
    expect(content).toBe('&quot;Done&quot; - see you...');
  });
});

describe('emptyTwiml', () => {
  it('is the reply that sends nothing', () => {
    expect(emptyTwiml()).toBe('<Response></Response>');
  });
});

describe('replies', () => {
  it('names the account and carries the program wording when linked', () => {
    const reply = replies.linked('Diablos FC');
    expect(reply).toBe(
      'FieldView.Live: This phone now runs text commands for Diablos FC. Msg frequency varies. Msg & data rates may apply. Reply STOP to pause, HELP for help.'
    );
    expect(smsLength(reply)).toBeLessThanOrEqual(SMS_TARGET_LENGTH);
  });

  it('shortens a long account name to stay inside two segments', () => {
    const reply = replies.linked('Very Long Club Name '.repeat(30));
    expect(smsLength(toGsm7(reply))).toBeLessThanOrEqual(SMS_TARGET_LENGTH);
    expect(reply.endsWith('Reply STOP to pause, HELP for help.')).toBe(true);
    expect(reply).toContain('...');
  });

  it('gives one answer for every LINK text that did not match', () => {
    expect(replies.linkNoMatch()).toBe(
      'FieldView.Live: That code did not match or has expired. Open Text commands in your FieldView account for a new code.'
    );
  });
});
