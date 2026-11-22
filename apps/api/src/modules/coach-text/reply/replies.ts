/**
 * Coach text commands: the words FieldView texts back.
 *
 * Every reply starts with the brand. The first reply to a newly linked phone
 * also carries the program wording carriers ask for.
 */

import { prefixSmsBrand } from '@fieldview/data-model';

import { SMS_TARGET_LENGTH, shortenToSmsLength, smsLength, toGsm7 } from './twiml';

const LINKED_START = 'This phone now runs text commands for ';
const LINKED_END =
  '. Msg frequency varies. Msg & data rates may apply. Reply STOP to pause, HELP for help.';
const NAME_FALLBACK = 'your account';

/** The account name in plain characters, short enough to keep the reply in two segments. */
function nameForReply(accountName: string): string {
  const room = SMS_TARGET_LENGTH - smsLength(prefixSmsBrand(LINKED_START + LINKED_END));
  const plain = toGsm7(accountName).replace(/\.+$/, '');
  return shortenToSmsLength(plain || NAME_FALLBACK, room);
}

export const replies = {
  /** The first text to a phone after its LINK text matched. */
  linked(accountName: string): string {
    return prefixSmsBrand(`${LINKED_START}${nameForReply(accountName)}${LINKED_END}`);
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
};
