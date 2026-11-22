/**
 * Coach text commands: the reply XML.
 *
 * The reply to a coach rides back in the webhook response. This is the only
 * file in the module that writes that XML (twiml-enforcement.test.ts checks),
 * so every reply is cut to length and escaped in one place.
 */

/** Two text segments. Replies are written to fit this. */
export const SMS_TARGET_LENGTH = 306;

/** Three text segments. A longer reply is cut here. */
export const SMS_HARD_LIMIT = 459;

const CUT_MARK = '...';

const GSM7_BASIC = new Set(
  '@\u00A3$\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00C7\n\u00D8\u00F8\u00C5\u00E5\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\u00C6\u00E6\u00DF\u00C9 !"#\u00A4%&\'()*+,-./0123456789:;<=>?\u00A1' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00C4\u00D6\u00D1\u00DC\u00A7\u00BFabcdefghijklmnopqrstuvwxyz\u00E4\u00F6\u00F1\u00FC\u00E0'
);

/** These cost two characters each in a text. */
const GSM7_EXTENSION = new Set('^{}\\[~]|\u20AC');

const PLAIN_FORM: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201A': "'",
  '\u2032': "'",
  '`': "'",
  '\u00B4': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u201E': '"',
  '\u2033': '"',
  '\u00AB': '"',
  '\u00BB': '"',
  '\u2010': '-',
  '\u2011': '-',
  '\u2012': '-',
  '\u2013': '-',
  '\u2014': '-',
  '\u2015': '-',
  '\u2212': '-',
  '\u2026': '...',
  '\u2022': '*',
  '\u00B7': '*',
  '\u00A0': ' ',
  '\u2009': ' ',
  '\u202F': ' ',
  '\t': ' ',
  '\r': '\n',
};

const COMBINING_MARKS = /[\u0300-\u036F]/g;

function isGsm7(char: string): boolean {
  return GSM7_BASIC.has(char) || GSM7_EXTENSION.has(char);
}

function plainForm(char: string): string {
  if (isGsm7(char)) {
    return char;
  }
  const mapped = PLAIN_FORM[char];
  if (mapped !== undefined) {
    return mapped;
  }
  const stripped = char.normalize('NFD').replace(COMBINING_MARKS, '');
  return stripped.length > 0 && [...stripped].every(isGsm7) ? stripped : '';
}

/**
 * Rewrites a text with the characters a plain text message can carry. Curly
 * quotes, dashes and accents get a plain form. Emoji and anything else with no
 * plain form are dropped, because one such character would turn the whole
 * text into the short, costly kind.
 */
export function toGsm7(text: string): string {
  const mapped = [...text.normalize('NFC').replace(/\r\n/g, '\n')].map(plainForm).join('');
  return mapped
    .replace(/ {2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n')
    .trim();
}

/** Length the way a text message counts it. Takes text from `toGsm7`. */
export function smsLength(text: string): number {
  let length = 0;
  for (const char of text) {
    length += GSM7_EXTENSION.has(char) ? 2 : 1;
  }
  return length;
}

/** Cuts a text to `max` characters, ending in "..." when it had to cut. */
export function shortenToSmsLength(text: string, max: number): string {
  if (smsLength(text) <= max) {
    return text;
  }
  const room = Math.max(0, max - CUT_MARK.length);
  let kept = '';
  let length = 0;
  for (const char of text) {
    const cost = GSM7_EXTENSION.has(char) ? 2 : 1;
    if (length + cost > room) {
      break;
    }
    kept += char;
    length += cost;
  }
  return kept.trimEnd() + CUT_MARK;
}

export function cutToSmsLength(text: string): string {
  return shortenToSmsLength(text, SMS_HARD_LIMIT);
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** The text as it goes out: plain characters only, cut to length. */
export function toSmsText(text: string): string {
  return cutToSmsLength(toGsm7(text));
}

/**
 * A reply that sends one text. The text is cut before it is escaped, so an
 * entity such as `&amp;` is never cut in half.
 */
export function twimlMessage(text: string): string {
  return `<Response><Message>${escapeXml(toSmsText(text))}</Message></Response>`;
}

/** A reply that sends nothing. */
export function emptyTwiml(): string {
  return '<Response></Response>';
}
