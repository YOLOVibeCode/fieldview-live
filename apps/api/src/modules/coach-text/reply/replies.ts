/**
 * Coach text commands: the words FieldView texts back.
 *
 * Every reply starts with the brand. The first reply after a phone links to an
 * account also carries the program wording carriers ask for.
 */

import { prefixSmsBrand } from '@fieldview/data-model';

import { SMS_TARGET_LENGTH, shortenToSmsLength, smsLength, toGsm7 } from './twiml';

const LINKED_START = 'This phone now runs text commands for ';
const PROGRAM_WORDING =
  'Msg frequency varies. Msg & data rates may apply. Reply STOP to pause, HELP for help.';
const NAME_FALLBACK = 'your account';
const QUESTION_START = 'Which account? ';
const QUESTION_END = '. Reply with the number, 0 for none.';
/** Name lengths tried, longest first, until the question fits its two segments. */
const QUESTION_NAME_LENGTHS = [24, 16, 10];

/** The account name in plain characters, cut to the room left in two segments. */
function nameIn(accountName: string, rest: string): string {
  const room = SMS_TARGET_LENGTH - smsLength(prefixSmsBrand(rest));
  const plain = toGsm7(accountName).replace(/\.+$/, '').trim();
  return shortenToSmsLength(plain || NAME_FALLBACK, room);
}

/** A name cut to a set length, for a list. */
function shortName(accountName: string, length: number): string {
  const plain = toGsm7(accountName).replace(/\.+$/, '').trim() || NAME_FALLBACK;
  return plain.length > length ? plain.slice(0, length).trimEnd() : plain;
}

export interface AccountChoice {
  n: number;
  accountName: string;
  /** The phone texts for this account now. */
  current: boolean;
}

export const replies = {
  /** The first text to a phone after its LINK text matched. */
  linked(accountName: string): string {
    const end = `. ${PROGRAM_WORDING}`;
    return prefixSmsBrand(`${LINKED_START}${nameIn(accountName, LINKED_START + end)}${end}`);
  },

  /** A phone that already works with another account now works with this one too. */
  linkedToo(accountName: string, accountCount: number): string {
    const end = ` too. It works with ${accountCount} accounts. Text ACCOUNT to choose one. ${PROGRAM_WORDING}`;
    return prefixSmsBrand(`${LINKED_START}${nameIn(accountName, LINKED_START + end)}${end}`);
  },

  /**
   * One answer for every LINK text that did not link, so the reply never tells
   * a stranger whether a number or a code exists.
   */
  linkNoMatch(): string {
    return prefixSmsBrand(
      'That code did not match or has expired. Open Text commands in your FieldView account for a new code.'
    );
  },

  /** Only the phone's holder can get this far: the code they texted matched. */
  linkTooManyAccounts(maxAccounts: number): string {
    return prefixSmsBrand(
      `This phone already works with ${maxAccounts} accounts. Remove it from one of them first.`
    );
  },

  accountOnlyOne(accountName: string): string {
    const start = 'This phone works with ';
    const end = ' only.';
    return prefixSmsBrand(`${start}${nameIn(accountName, start + end)}${end}`);
  },

  /** Which account, as single digits. The current choice is marked "(now)". */
  accountQuestion(choices: AccountChoice[]): string {
    let text = '';
    for (const length of QUESTION_NAME_LENGTHS) {
      const list = choices
        .map((choice) => `${choice.n} ${shortName(choice.accountName, length)}${choice.current ? ' (now)' : ''}`)
        .join(', ');
      text = prefixSmsBrand(`${QUESTION_START}${list}${QUESTION_END}`);
      if (smsLength(text) <= SMS_TARGET_LENGTH) {
        break;
      }
    }
    return text;
  },

  accountChosen(accountName: string, untilText: string): string {
    const start = 'Texting for ';
    const end = ` until ${untilText}. Text ACCOUNT to switch.`;
    return prefixSmsBrand(`${start}${nameIn(accountName, start + end)}${end}`);
  },

  nothingChanged(): string {
    return prefixSmsBrand('Nothing changed. Text ACCOUNT to choose an account.');
  },

  answerNotAnOption(optionCount: number): string {
    return prefixSmsBrand(`Reply with a number from 1 to ${optionCount}, or 0 for none.`);
  },

  questionClosed(): string {
    return prefixSmsBrand('That question has closed. Text ACCOUNT to choose again.');
  },

  accountGone(): string {
    return prefixSmsBrand('That account no longer works with this phone. Text ACCOUNT to choose again.');
  },
};
