/**
 * ViewerAccessService Interface
 * 
 * Determines what actions a viewer can perform on a DirectStream.
 */

import type { DirectStream, ViewerIdentity } from '@prisma/client';

export type AccessResult =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | 'anonymous_not_allowed'
        | 'verification_required'
        | 'chat_disabled'
        | 'not_registered';
    };

export interface IViewerAccessService {
  /**
   * Check if viewer can view the stream (load the page and see video)
   */
  canViewStream(stream: DirectStream, viewer: ViewerIdentity | null): Promise<AccessResult>;

  /**
   * Check if viewer can participate in chat
   */
  canChat(stream: DirectStream, viewer: ViewerIdentity | null): Promise<AccessResult>;
}

