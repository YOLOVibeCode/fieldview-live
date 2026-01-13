/**
 * Viewer Refresh Token Repository Interface (ISP)
 * Segregated Reader and Writer interfaces for viewer refresh tokens
 */

export interface ViewerRefreshTokenData {
  id: string;
  tokenHash: string;
  viewerIdentityId: string;
  directStreamId: string | null;
  gameId: string | null;
  redirectUrl: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreateViewerRefreshTokenInput {
  tokenHash: string;
  viewerIdentityId: string;
  directStreamId?: string;
  gameId?: string;
  redirectUrl?: string;
  expiresAt: Date;
}

/**
 * Reader interface - Query operations only
 */
export interface IViewerRefreshTokenReader {
  /**
   * Find a token by its hash
   */
  findByTokenHash(tokenHash: string): Promise<ViewerRefreshTokenData | null>;

  /**
   * Find unexpired tokens for a viewer identity
   */
  findUnexpiredByViewerId(viewerIdentityId: string): Promise<ViewerRefreshTokenData[]>;

  /**
   * Count recent token requests by email (for rate limiting)
   */
  countRecentByEmail(email: string, sinceDate: Date): Promise<number>;
}

/**
 * Writer interface - Mutation operations only
 */
export interface IViewerRefreshTokenWriter {
  /**
   * Create a new viewer refresh token
   */
  create(input: CreateViewerRefreshTokenInput): Promise<ViewerRefreshTokenData>;

  /**
   * Mark a token as used
   */
  markAsUsed(id: string): Promise<void>;

  /**
   * Invalidate all tokens for a viewer
   */
  invalidateAllForViewer(viewerIdentityId: string): Promise<number>;

  /**
   * Delete expired tokens (cleanup job)
   */
  deleteExpired(): Promise<number>;
}

/**
 * Combined interface for convenience
 */
export interface IViewerRefreshTokenRepository
  extends IViewerRefreshTokenReader,
    IViewerRefreshTokenWriter {}

