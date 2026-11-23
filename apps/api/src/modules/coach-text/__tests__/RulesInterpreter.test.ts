/**
 * How the bot reads a coach's text, with the coach's own sentences as cases.
 */
import { describe, expect, it } from 'vitest';

import type { Intent } from '../interfaces';
import { RulesInterpreter, readRules } from '../interpret/RulesInterpreter';

const attach = (offerNewPage = false): Intent => ({ action: 'attach', offerNewPage });

describe('RulesInterpreter', () => {
  describe('the coach sentences from the plan', () => {
    it.each<[string, Intent | null]>([
      ["update the current active game with the current Veo session that's streaming", attach()],
      ["update to the current active game with the current VAO session that's streaming", attach()],
      ['add the stream to the game', attach()],
      ['create a page for this for livestream and then add the stream to the game', attach(true)],
      ["what's live", { action: 'live' }],
      // Creating a page by text comes in a later update; until then these are not understood.
      ["add a game for the Diablo's vs Sporting UPSL", null],
      ['NEW Diablos vs Sporting', null],
    ])('%s', (body, expected) => {
      expect(readRules(body)).toEqual(expected);
    });
  });

  describe('exact words', () => {
    it.each<[string, Intent]>([
      ['MENU', { action: 'menu' }],
      ['menu', { action: 'menu' }],
      [' Menu. ', { action: 'menu' }],
      ['LIVE', { action: 'live' }],
      ['live?', { action: 'live' }],
      ['GAMES', { action: 'games' }],
      ['ATTACH', attach()],
      ['attach!', attach()],
      ['UNDO', { action: 'undo' }],
      ['UNLINK', { action: 'unlink' }],
      ['What’s live?', { action: 'live' }],
      ['what is live', { action: 'live' }],
      ['what is streaming', { action: 'live' }],
      ["what's streaming", { action: 'live' }],
      ['my games', { action: 'games' }],
      ['put it back', { action: 'undo' }],
      ['Put it back.', { action: 'undo' }],
    ])('%s', (body, expected) => {
      expect(readRules(body)).toEqual(expected);
    });
  });

  describe('attach forms', () => {
    it.each([
      'put the veo on the game',
      'use the camera',
      'switch the feed',
      'change the video please',
      'connect the broadcast',
      'set the stream',
      'link the stream to the game',
      'Attach the live stream',
      'put the livestream on',
      'Update the game with the streams',
    ])('%s', (body) => {
      expect(readRules(body)).toEqual(attach());
    });

    it('offers a new page when a create form is in the same text', () => {
      expect(readRules('make a game and put the stream on it')).toEqual(attach(true));
      expect(readRules('set up an event and use the camera')).toEqual(attach(true));
    });
  });

  describe('near misses that must not match', () => {
    it.each([
      'stream',
      'the veo is on',
      'add Jordan to the roster',
      'update the score',
      'set up a game',
      'unlink the camera',
      'undo it all please',
      'live stream',
      'my game',
      'menus',
      'attached',
      'what is the score',
      'put it on',
      'LINK 12345',
      'streaming now',
      '',
      '   ',
    ])('%s', (body) => {
      expect(readRules(body)).toBeNull();
    });
  });

  it('answers through the interface too', async () => {
    await expect(new RulesInterpreter().interpret('LIVE')).resolves.toEqual({ action: 'live' });
    await expect(new RulesInterpreter().interpret('score 3-1')).resolves.toBeNull();
  });
});
