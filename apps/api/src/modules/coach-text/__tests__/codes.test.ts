import { describe, expect, it } from 'vitest';

import { generateLinkCode, hashLinkCode, linkCodeMatches, maskLinkText, parseLinkText } from '../codes';

describe('generateLinkCode', () => {
  it('gives six digits every time', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateLinkCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('hashLinkCode and linkCodeMatches', () => {
  it('matches the same code with the same salt only', () => {
    const hash = hashLinkCode('482913', 'link-a');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('482913');
    expect(linkCodeMatches('482913', 'link-a', hash)).toBe(true);
    expect(linkCodeMatches('482914', 'link-a', hash)).toBe(false);
    expect(linkCodeMatches('482913', 'link-b', hash)).toBe(false);
  });

  it('answers false for a missing or damaged stored hash', () => {
    expect(linkCodeMatches('482913', 'link-a', null)).toBe(false);
    expect(linkCodeMatches('482913', 'link-a', 'short')).toBe(false);
  });
});

describe('parseLinkText', () => {
  it.each([
    ['LINK 482913', '482913'],
    ['link 482913', '482913'],
    ['Link482913', '482913'],
    ['LINK-482913', '482913'],
    ['LINK: 482913', '482913'],
    ['  LINK   482913  ', '482913'],
  ])('reads %s', (body, code) => {
    expect(parseLinkText(body)).toBe(code);
  });

  it.each(['LINK', 'LINK 48291', 'LINK 4829133', 'LINKS 482913', 'UNLINK 482913', 'LINK 482913 now', '482913'])(
    'ignores %s',
    (body) => {
      expect(parseLinkText(body)).toBeNull();
    }
  );
});

describe('maskLinkText', () => {
  it('hides the digits before a text is stored', () => {
    expect(maskLinkText()).toBe('LINK ******');
  });
});
