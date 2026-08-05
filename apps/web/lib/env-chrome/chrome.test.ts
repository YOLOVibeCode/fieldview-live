import { afterEach, describe, expect, it } from 'vitest';
import { applyEnvChrome, badgeFor, envFromHost, faviconDataUri } from './chrome';
import { HOST_RULES } from '@/env-chrome.config';

describe('envFromHost — FieldView.Live hostname rules', () => {
  it('maps the friendly domains to their environment', () => {
    expect(envFromHost('dev.fieldview.live', HOST_RULES)).toBe('dev');
    expect(envFromHost('uat.fieldview.live', HOST_RULES)).toBe('uat');
    expect(envFromHost('fieldview.live', HOST_RULES)).toBe('production');
    expect(envFromHost('www.fieldview.live', HOST_RULES)).toBe('production');
  });

  it('treats localhost as local and anything else as unknown', () => {
    expect(envFromHost('localhost', HOST_RULES)).toBe('local');
    expect(envFromHost('127.0.0.1', HOST_RULES)).toBe('local');
    expect(envFromHost('some-random-host.example.com', HOST_RULES)).toBe('unknown');
  });

  it('never mislabels the bare prod domain as a sub-env (no false banner on prod)', () => {
    expect(envFromHost('fieldview.live', HOST_RULES)).not.toBe('dev');
    expect(envFromHost('fieldview.live', HOST_RULES)).not.toBe('uat');
    expect(envFromHost('www.fieldview.live', HOST_RULES)).not.toBe('dev');
    expect(envFromHost('www.fieldview.live', HOST_RULES)).not.toBe('uat');
  });
});

describe('badgeFor', () => {
  it('returns null for production and unknown (clean, no chrome)', () => {
    expect(badgeFor('production')).toBeNull();
    expect(badgeFor('unknown')).toBeNull();
  });

  it('returns a warning badge for non-prod envs with the standard palette', () => {
    expect(badgeFor('uat')).toMatchObject({ short: 'UAT', color: '#b45309', letter: 'U' });
    expect(badgeFor('dev')).toMatchObject({ short: 'DEV', color: '#4338ca', letter: 'D' });
    expect(badgeFor('local')).toMatchObject({ short: 'LOCAL', color: '#334155', letter: 'L' });
    expect(badgeFor('uat')?.label).toMatch(/not production/i);
  });
});

describe('faviconDataUri', () => {
  it('produces an inline SVG data URI carrying the colour and letter', () => {
    const uri = faviconDataUri('#b45309', 'U');
    expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
    expect(svg).toContain('#b45309');
    expect(svg).toContain('>U<');
  });
});

describe('applyEnvChrome — Mailpit link (dev toolbar)', () => {
  afterEach(() => {
    document.getElementById('env-banner')?.remove();
    document.title = 'FieldView';
  });

  it('renders a 📧 Mailpit link on dev when mailpitUrl is provided', () => {
    applyEnvChrome('dev', { mailpitUrl: 'https://mailpit.noctusoft.com' });
    const link = document.getElementById('env-mailpit-link') as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://mailpit.noctusoft.com');
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
    expect(link!.textContent).toContain('Mailpit');
    // banner still shows the env label alongside the link
    expect(document.getElementById('env-banner')?.textContent).toMatch(/Development/i);
  });

  it('renders no link on dev when mailpitUrl is absent (prod builds pass nothing)', () => {
    applyEnvChrome('dev');
    expect(document.getElementById('env-banner')).not.toBeNull();
    expect(document.getElementById('env-mailpit-link')).toBeNull();
  });

  it('does not duplicate the link when re-applied', () => {
    applyEnvChrome('dev', { mailpitUrl: 'https://mailpit.noctusoft.com' });
    applyEnvChrome('dev', { mailpitUrl: 'https://mailpit.noctusoft.com' });
    expect(document.querySelectorAll('#env-mailpit-link').length).toBe(1);
  });

  it('shows no banner or link on production (link URL ignored)', () => {
    applyEnvChrome('production', { mailpitUrl: 'https://mailpit.noctusoft.com' });
    expect(document.getElementById('env-banner')).toBeNull();
    expect(document.getElementById('env-mailpit-link')).toBeNull();
  });
});
