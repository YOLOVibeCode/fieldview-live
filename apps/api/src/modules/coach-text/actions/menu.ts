/**
 * MENU: the commands a coach can text.
 */

import { replies } from '../reply/replies';

import type { CommandOutcome } from './types';

export function runMenu(severalAccounts: boolean): CommandOutcome {
  return { reply: replies.menu(severalAccounts), status: 'done', reason: 'menu', action: 'menu' };
}
