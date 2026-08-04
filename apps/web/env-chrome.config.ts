import type { HostRule } from '@/lib/env-chrome/chrome';

/**
 * FieldView.Live hostname → environment rules for the shared env-chrome
 * pattern. See `/Users/admin/.claude/plans/lovely-bouncing-pelican.md` for
 * the spec. UAT tier isn't provisioned yet — the rule is here so the day it
 * lands, `uat.fieldview.live` will Just Work.
 */
export const HOST_RULES: readonly HostRule[] = [
  [/^dev\.fieldview\.live$/i, 'dev'],
  [/^uat\.fieldview\.live$/i, 'uat'],
  [/^(www\.)?fieldview\.live$/i, 'production'],
  [/^(localhost|127\.0\.0\.1|\[::1\])$/i, 'local'],
];
