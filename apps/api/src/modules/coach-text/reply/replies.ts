/**
 * Coach text commands: the words FieldView texts back.
 *
 * Every reply starts with the brand. The first reply after a phone links to an
 * account also carries the program wording carriers ask for. No reply ever
 * carries a stream URL; the public page URL is fine. No reply is written by a
 * model: each one is a template here.
 */

import { SMS_BRAND, prefixSmsBrand } from '@fieldview/data-model';

import type { SourceReport } from '../../camera-sources/interfaces';

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

/** Longest game or stream title in a reply. Titles are shortened before anything else. */
const TITLE_LENGTH = 40;
/** Title lengths tried for a numbered list, longest first, until it fits two segments. */
const OPTION_TITLE_LENGTHS = [40, 28, 18];
const UNTITLED = 'Untitled stream';
const BRAND_PREFIX = `${SMS_BRAND}: `;

/** A title in plain characters, shortened with "..." past `length`. */
function title(text: string, length = TITLE_LENGTH): string {
  const plain = toGsm7(text).replace(/\s+/g, ' ').trim();
  return shortenToSmsLength(plain || UNTITLED, length);
}

/** The reply without the brand, to put something between the brand and the words. */
function withoutBrand(reply: string): string {
  return reply.startsWith(BRAND_PREFIX) ? reply.slice(BRAND_PREFIX.length) : reply;
}

/** `Veo, Other` the way the portal names the sources. */
function sourceNames(sources: SourceReport[]): string {
  return sources.map((source) => source.displayName).join(', ');
}

/** One numbered option: its number, and what the coach reads. */
export interface ListedOption {
  n: number;
  /** The title, shortened here. */
  title: string;
  /** Added after the title, e.g. "started 7:02 PM". Not shortened. */
  detail?: string;
}

function numberedList(start: string, options: ListedOption[]): string {
  let text = '';
  for (const length of OPTION_TITLE_LENGTHS) {
    const lines = options.map(
      (option) => `${option.n} ${title(option.title, length)}${option.detail ? `, ${option.detail}` : ''}`
    );
    text = prefixSmsBrand(`${start} Reply with a number:\n${lines.join('\n')}\n0 None of these`);
    if (smsLength(toGsm7(text)) <= SMS_TARGET_LENGTH) {
      break;
    }
  }
  return text;
}

export interface LiveStreamLine {
  title: string;
  provider: string;
  /** "7:02 PM", or null when the camera did not say. */
  startedAt: string | null;
}

export interface LiveGameLine {
  title: string;
  /** What the game's page plays now. */
  shows: { kind: 'stream'; title: string } | { kind: 'other' } | { kind: 'none' };
}

export interface LiveSummary {
  streams: LiveStreamLine[];
  /** Streams not listed. */
  more: number;
  /** When nothing is live: the portal's own sentence for why. */
  nothingLive: string | null;
  games: LiveGameLine[];
  /** A fresh stream is live and a game on now does not show it. */
  attachHint: boolean;
}

export interface GameLine {
  title: string;
  /** "Sun 3:00 PM". */
  when: string;
  onNow: boolean;
  hasStream: boolean;
}

export interface AttachedReply {
  game: string;
  stream: string;
  provider: string;
  /** "7:02 PM", or null when the camera did not say. */
  startedAt: string | null;
  pageUrl: string;
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

  // ── Commands ──────────────────────────────────────────────────────────────

  /** A phone on several accounts also hears about ACCOUNT. */
  menu(severalAccounts: boolean): string {
    const account = severalAccounts ? ' Text ACCOUNT to choose an account.' : '';
    return prefixSmsBrand(
      `Text LIVE for what is streaming, GAMES for your pages, ATTACH to put the live stream on your game, UNDO to put it back, UNLINK to remove this phone.${account} Reply STOP to pause, HELP for help.`
    );
  },

  notUnderstood(): string {
    return prefixSmsBrand('I did not understand that. Text MENU for what I can do.');
  },

  stillWorking(): string {
    return prefixSmsBrand('Still working on your last text. Try again in a few seconds.');
  },

  cameraSlow(): string {
    return prefixSmsBrand('Still checking your camera. Nothing changed. Text LIVE again in a few seconds.');
  },

  /** The reply window ran out before the change could start. */
  tooSlow(): string {
    return prefixSmsBrand('That took too long, so nothing changed. Send it again.');
  },

  /** Something broke while a command ran. Nothing was written. */
  failed(): string {
    return prefixSmsBrand('Something went wrong and nothing changed. Try again in a moment.');
  },

  accountOff(): string {
    return prefixSmsBrand('Text commands are off for this account.');
  },

  linkExpired(): string {
    return prefixSmsBrand(
      "This phone's link has expired. Open Text commands in your FieldView account to link it again."
    );
  },

  /** The sentences the portal's Find live stream button uses, unchanged. */
  nothingLiveSentence(sources: SourceReport[]): string {
    if (sources.length === 0) {
      return 'No streaming provider is connected to this account yet.';
    }
    const needReconnect = sources.filter((source) => source.status === 'needs_reconnect');
    if (needReconnect.length > 0) {
      return `${sourceNames(needReconnect)} needs to be reconnected before it can be searched.`;
    }
    const failed = sources.filter((source) => source.status === 'error');
    if (failed.length > 0) {
      return `Could not reach ${sourceNames(failed)} right now. Try again in a moment.`;
    }
    return `Nothing is live on ${sourceNames(sources)} right now.`;
  },

  nothingLive(sources: SourceReport[]): string {
    return prefixSmsBrand(replies.nothingLiveSentence(sources));
  },

  live(summary: LiveSummary): string {
    const parts: string[] = [];
    if (summary.nothingLive) {
      parts.push(summary.nothingLive);
    } else {
      const listed = summary.streams.map(
        (stream) => `${title(stream.title, 32)} (${stream.provider}${stream.startedAt ? `, started ${stream.startedAt}` : ''})`
      );
      const more = summary.more > 0 ? `, and ${summary.more} more` : '';
      parts.push(`Live now: ${listed.join('; ')}${more}.`);
    }
    if (summary.games.length === 0) {
      parts.push('No game is on now.');
    }
    for (const game of summary.games) {
      const shows =
        game.shows.kind === 'stream'
          ? `shows ${title(game.shows.title, 32)}`
          : game.shows.kind === 'other'
            ? 'shows a stream that is not live now'
            : 'has no stream yet';
      parts.push(`${title(game.title, 32)} ${shows}.`);
    }
    if (summary.attachHint) {
      parts.push('Text ATTACH to put it on your game.');
    }
    return prefixSmsBrand(parts.join(' '));
  },

  games(lines: GameLine[]): string {
    if (lines.length === 0) {
      return prefixSmsBrand('No game page is on now or in the next 24 hours.');
    }
    const listed = lines.map(
      (line) =>
        `${title(line.title, 32)}, ${line.when}${line.onNow ? ', on now' : ''}, ${line.hasStream ? 'has a stream' : 'no stream'}`
    );
    return prefixSmsBrand(`Your games: ${listed.join('; ')}.`);
  },

  attached(input: AttachedReply): string {
    const started = input.startedAt ? `, started ${input.startedAt}` : '';
    return prefixSmsBrand(
      `Done. ${title(input.game)} now shows ${title(input.stream)} from ${input.provider}${started}. ${input.pageUrl} Viewers may need to refresh. Text UNDO to put it back.`
    );
  },

  alreadyShows(game: string): string {
    return prefixSmsBrand(`Nothing changed. ${title(game)} already shows that stream.`);
  },

  /** Which stream goes on the one game on now. */
  streamQuestion(game: string, options: ListedOption[]): string {
    const count = options.length === 1 ? 'A stream is live.' : `${options.length} streams are live.`;
    return numberedList(`${count} Which one goes on ${title(game, 32)}?`, options);
  },

  /** Which game a stream goes on: several games on now, or none and these are the nearest pages. */
  gameQuestion(input: { onNow: boolean; count: number; stream: string | null; options: ListedOption[] }): string {
    const start = input.onNow ? `${input.count} games are on now.` : 'No game is on right now.';
    const ask = input.stream
      ? input.onNow
        ? `Which one gets ${title(input.stream, 32)}?`
        : `Where does ${title(input.stream, 32)} go?`
      : 'Which page is the stream for?';
    return numberedList(`${start} ${ask}`, input.options);
  },

  noPages(): string {
    return prefixSmsBrand(
      'No game is on right now and no game page is coming up. Make one in your FieldView account first.'
    );
  },

  pageGone(): string {
    return prefixSmsBrand('That game page is not open any more. Nothing changed.');
  },

  changedMeanwhile(): string {
    return prefixSmsBrand('That game changed while I was working. Nothing changed. Text LIVE to see it.');
  },

  undone(game: string): string {
    return prefixSmsBrand(`Put back. ${title(game)} shows its earlier stream again.`);
  },

  nothingToUndo(): string {
    return prefixSmsBrand('Nothing to undo.');
  },

  undoChangedSince(game: string): string {
    return prefixSmsBrand(`${title(game)} was changed again after your text, so I left it alone.`);
  },

  unlinked(): string {
    return prefixSmsBrand('This phone is unlinked. Link it again from Text commands in your FieldView account.');
  },

  // ── Numbered questions ────────────────────────────────────────────────────

  noOpenQuestion(): string {
    return prefixSmsBrand('There is no open question. Text MENU for what I can do.');
  },

  questionExpired(): string {
    return prefixSmsBrand('That question has expired. Send the command again.');
  },

  /** A second answer lost the race for a question other than the account one. */
  questionClosedTryAgain(): string {
    return prefixSmsBrand('That question has closed. Send the command again.');
  },

  answeredNone(): string {
    return prefixSmsBrand('OK. Nothing changed.');
  },

  yesHint(): string {
    return prefixSmsBrand('Reply with the number, for example 1.');
  },

  // ── What goes around a reply ──────────────────────────────────────────────

  /**
   * A reply to a phone on several accounts starts with the account's name.
   * `auto` says the account was picked because only it has a game on now.
   */
  forAccount(reply: string, accountName: string, auto: boolean): string {
    const name = shortName(accountName, 24);
    return prefixSmsBrand(`${name}${auto ? ' (game on now)' : ''}: ${withoutBrand(reply)}`);
  },

  /** The phone's last text never got its answer. */
  afterTimeout(reply: string): string {
    return prefixSmsBrand(`Your last text timed out and changed nothing. ${withoutBrand(reply)}`);
  },
};
