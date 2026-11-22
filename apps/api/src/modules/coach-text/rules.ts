/**
 * Coach text commands: when a link may act.
 *
 * Shared by the phone list (PhoneLinkService) and the account chooser, so both
 * agree on which links count.
 */

import { isOwnerAllowed, linkIdleDays } from './config';
import type { CoachTextLinkRecord, CoachTextOwner } from './interfaces';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Owner accounts stay `pending_verification` for a long time, so only a suspension blocks. */
export function mayUse(owner: CoachTextOwner): boolean {
  return (
    owner.loginStatus === 'active' &&
    owner.accountStatus !== 'suspended' &&
    !owner.accountSuspended &&
    isOwnerAllowed(owner.ownerAccountId)
  );
}

/** No text since the phone was proven or last used, for longer than the idle limit. */
export function isIdle(
  link: Pick<CoachTextLinkRecord, 'lastCommandAt' | 'verifiedAt'>,
  now: Date
): boolean {
  const last = link.lastCommandAt ?? link.verifiedAt;
  return last !== null && now.getTime() - last.getTime() > linkIdleDays() * DAY_MS;
}

/** The link can act for its account now: proven, not paused, not idle, and allowed. */
export function isLive(link: CoachTextLinkRecord, now: Date): boolean {
  return link.verifiedAt !== null && link.pausedAt === null && !isIdle(link, now) && mayUse(link.owner);
}
