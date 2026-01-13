/**
 * Viewer Refresh Service Interface (ISP)
 * Handles viewer access refresh/re-consent flow
 */

export interface ViewerRefreshRequestInput {
  email: string;
  directStreamId?: string;
  gameId?: string;
  redirectUrl?: string;
}

export interface ViewerRefreshRequestResult {
  success: boolean;
  message: string;
}

export interface ViewerRefreshVerifyResult {
  valid: boolean;
  viewerIdentityId?: string;
  redirectUrl?: string;
  error?: string;
}

/**
 * Viewer Refresh Service - Business logic for access refresh
 */
export interface IViewerRefreshService {
  /**
   * Step 1: Request access refresh (sends email with token)
   * Returns generic success message
   */
  requestRefresh(input: ViewerRefreshRequestInput): Promise<ViewerRefreshRequestResult>;

  /**
   * Step 2: Verify and restore access
   * Creates new viewer token and redirects to stream
   */
  verifyAndRestoreAccess(token: string): Promise<ViewerRefreshVerifyResult>;

  /**
   * Cleanup job: Delete expired tokens
   */
  cleanupExpiredTokens(): Promise<number>;
}

