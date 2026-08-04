/**
 * Environment delineation chrome — isomorphic pieces (badge table, hostname
 * mapper, favicon SVG generator, DOM applier). Ports the CaptionFlow pattern
 * with one change: `envFromHost` takes `hostRules` as a parameter so each
 * project can pass its own `HOST_RULES` without forking this file.
 *
 * Standard defined at `/Users/admin/.claude/plans/lovely-bouncing-pelican.md`.
 * Any change to the visual mapping here must match every other project's copy.
 */

export type AppEnv = 'dev' | 'uat' | 'production' | 'local' | 'unknown';

export type HostRule = readonly [RegExp, AppEnv];

export function envFromHost(host: string, hostRules: readonly HostRule[]): AppEnv {
  for (const [re, env] of hostRules) if (re.test(host)) return env;
  return 'unknown';
}

export type Badge = { label: string; short: string; color: string; letter: string };

export const BADGES: Record<Exclude<AppEnv, 'production' | 'unknown'>, Badge> = {
  uat: { label: 'UAT · Test environment — not production', short: 'UAT', color: '#b45309', letter: 'U' },
  dev: { label: 'Development', short: 'DEV', color: '#4338ca', letter: 'D' },
  local: { label: 'Local dev', short: 'LOCAL', color: '#334155', letter: 'L' },
};

export function badgeFor(env: AppEnv): Badge | null {
  return env === 'production' || env === 'unknown' ? null : BADGES[env];
}

export function faviconDataUri(color: string, letter: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="7" fill="${color}"/>` +
    `<text x="16" y="23" font-family="ui-sans-serif,system-ui,sans-serif" font-size="20" ` +
    `font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

let baseTitle: string | null = null;
let baseFavicon: string | null = null;

function faviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

/** Apply (or clear, for production) the banner + title prefix + favicon tint. */
export function applyEnvChrome(env: AppEnv): void {
  if (baseTitle === null) baseTitle = document.title.replace(/^\[[A-Z]+\]\s+/, '');
  const link = faviconLink();
  if (baseFavicon === null) baseFavicon = link.getAttribute('href') || '/favicon.ico';

  const badge = badgeFor(env);
  const existing = document.getElementById('env-banner');

  if (!badge) {
    existing?.remove();
    document.title = baseTitle;
    link.setAttribute('href', baseFavicon);
    return;
  }

  const banner = existing ?? document.createElement('div');
  banner.id = 'env-banner';
  banner.setAttribute('role', 'status');
  banner.textContent = badge.label;
  banner.style.cssText = [
    `background:${badge.color}`,
    'color:#fff',
    'font:700 12px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif',
    'letter-spacing:.06em',
    'text-transform:uppercase',
    'text-align:center',
    'padding:5px 12px',
    'width:100%',
    'box-sizing:border-box',
  ].join(';');
  if (!existing) document.body.insertBefore(banner, document.body.firstChild);

  document.title = `[${badge.short}] ${baseTitle}`;
  link.setAttribute('href', faviconDataUri(badge.color, badge.letter));
}
