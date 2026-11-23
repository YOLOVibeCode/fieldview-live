/**
 * Coach text commands: the list the owner portal shows.
 */

import type { CoachTextCommandHelp } from '@fieldview/data-model';

export const COACH_TEXT_COMMANDS: readonly CoachTextCommandHelp[] = [
  { word: 'LIVE', description: 'What is streaming on your camera now, and what your game on now shows.' },
  { word: 'GAMES', description: 'Your game pages on now and in the next 24 hours, up to five.' },
  {
    word: 'ATTACH',
    description: 'Puts the live stream on your game, or asks which one. A sentence works too, such as "add the stream to the game".',
  },
  { word: 'UNDO', description: 'Puts back the last change made by text on your account, within 30 minutes.' },
  { word: 'ACCOUNT', description: 'For a phone on several accounts: chooses the account it texts for.' },
  { word: 'UNLINK', description: 'Removes this phone from the account.' },
  { word: 'MENU', description: 'Lists the commands.' },
  { word: '1 to 9, 0', description: 'Answers a numbered question. 0 means none of these.' },
];
