/**
 * A game page's link: the address viewers open, built on the site the coach is using.
 */

import { describe, expect, it } from 'vitest';

import { currentOrigin, directStreamUrl, displayLink } from '../direct-links';

describe('direct stream links', () => {
  it('builds the address viewers open', () => {
    expect(directStreamUrl('https://fieldview.live', 'tigers-vs-hawks')).toBe(
      'https://fieldview.live/direct/tigers-vs-hawks'
    );
  });

  it('builds it on any site, with or without a closing slash', () => {
    expect(directStreamUrl('https://uat.fieldview.live/', 'tigers-vs-hawks')).toBe(
      'https://uat.fieldview.live/direct/tigers-vs-hawks'
    );
    expect(directStreamUrl('http://localhost:4300', 'jv-final')).toBe('http://localhost:4300/direct/jv-final');
  });

  it('keeps an odd slug inside its own part of the address', () => {
    expect(directStreamUrl('https://fieldview.live', 'a b/c')).toBe('https://fieldview.live/direct/a%20b%2Fc');
  });

  it('shows the address the way people read it, without https://', () => {
    expect(displayLink('https://fieldview.live/direct/tigers-vs-hawks')).toBe('fieldview.live/direct/tigers-vs-hawks');
    expect(displayLink('http://localhost:4300/direct/jv-final')).toBe('localhost:4300/direct/jv-final');
  });

  it('uses the site the page is open on', () => {
    expect(currentOrigin()).toBe(window.location.origin);
  });
});
