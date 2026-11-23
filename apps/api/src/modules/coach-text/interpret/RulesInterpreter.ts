/**
 * Coach text commands: reading a text with fixed rules.
 *
 * The text is trimmed, upper-cased, stripped of end punctuation, and curly
 * quotes become straight ones. Then the rules run in order, first match wins:
 *
 *   1. Exact words: MENU, LIVE, GAMES, ATTACH, UNDO, UNLINK, and a few phrases
 *      such as "what's live", "my games" and "put it back".
 *   2. Attach forms: a verb (attach, add, put, set, update, use, link, connect,
 *      switch, change) together with a stream word (stream, veo, vao, video,
 *      camera, feed, session, broadcast) anywhere in the text. "Vao" is how
 *      dictation writes Veo.
 *   3. A create form (a create verb directly followed by a page noun) in the same
 *      text as an attach form makes the attach also offer a new page.
 *
 * A create form on its own, and anything else, is not understood. Creating a
 * page by text comes in a later update.
 */

import type { ICommandInterpreter, Intent } from '../interfaces';

const EXACT: Record<string, Intent> = {
  MENU: { action: 'menu' },
  LIVE: { action: 'live' },
  GAMES: { action: 'games' },
  ATTACH: { action: 'attach', offerNewPage: false },
  UNDO: { action: 'undo' },
  UNLINK: { action: 'unlink' },
  "WHAT'S LIVE": { action: 'live' },
  'WHATS LIVE': { action: 'live' },
  'WHAT IS LIVE': { action: 'live' },
  "WHAT'S STREAMING": { action: 'live' },
  'WHATS STREAMING': { action: 'live' },
  'WHAT IS STREAMING': { action: 'live' },
  'MY GAMES': { action: 'games' },
  'PUT IT BACK': { action: 'undo' },
};

const ATTACH_VERBS = new Set([
  'attach',
  'add',
  'put',
  'set',
  'update',
  'use',
  'link',
  'connect',
  'switch',
  'change',
]);

const STREAM_WORDS = new Set([
  'stream',
  'streams',
  'streaming',
  'veo',
  'vao',
  'video',
  'videos',
  'camera',
  'cameras',
  'feed',
  'feeds',
  'session',
  'sessions',
  'broadcast',
  'broadcasts',
]);

/** One-word create verbs. "set up" is matched as two words. */
const CREATE_VERBS = new Set(['add', 'create', 'make', 'start']);
const PAGE_NOUNS = new Set(['game', 'games', 'page', 'pages', 'event', 'events']);
/** Words allowed between a create verb and its noun: "create a page", "add a new game". */
const FILLERS = new Set(['a', 'an', 'the', 'new', 'another']);

/** The text the rules read: one line, upper case, straight quotes, no end punctuation. */
export function normalizeText(body: string): string {
  return body
    .replace(/[‘’‚′`´]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/[\s.!?,;:]+$/, '')
    .trim();
}

function wordsOf(normalized: string): string[] {
  return normalized
    .toLowerCase()
    .replace(/'/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

function isStreamWord(word: string): boolean {
  // "livestream", "livestreams"
  return STREAM_WORDS.has(word) || word.endsWith('stream') || word.endsWith('streams');
}

function hasAttachForm(words: string[]): boolean {
  return words.some((word) => ATTACH_VERBS.has(word)) && words.some(isStreamWord);
}

/** A create verb directly followed by a page noun, allowing an article between. */
function hasCreateForm(words: string[]): boolean {
  for (let i = 0; i < words.length; i += 1) {
    let next = -1;
    if (CREATE_VERBS.has(words[i])) {
      next = i + 1;
    } else if (words[i] === 'set' && words[i + 1] === 'up') {
      next = i + 2;
    }
    if (next < 0) {
      continue;
    }
    while (next < words.length && FILLERS.has(words[next])) {
      next += 1;
    }
    if (next < words.length && PAGE_NOUNS.has(words[next])) {
      return true;
    }
  }
  return false;
}

/** The rules on their own, for tests and for the engine. */
export function readRules(body: string): Intent | null {
  const normalized = normalizeText(body);
  if (!normalized) {
    return null;
  }
  const exact = EXACT[normalized];
  if (exact) {
    return { ...exact };
  }
  const words = wordsOf(normalized);
  if (hasAttachForm(words)) {
    return { action: 'attach', offerNewPage: hasCreateForm(words) };
  }
  return null;
}

export class RulesInterpreter implements ICommandInterpreter {
  interpret(body: string): Promise<Intent | null> {
    return Promise.resolve(readRules(body));
  }
}
