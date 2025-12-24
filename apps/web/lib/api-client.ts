/**
 * Typed API Client
 * 
 * Client for making API requests to the backend.
 * Types will be generated from OpenAPI spec.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      error.error?.code || 'UNKNOWN_ERROR',
      error.error?.message || 'An error occurred',
      error.error?.details
    );
  }

  return response.json();
}

function withBearerToken(token: string | null | undefined): HeadersInit | undefined {
  if (!token) return undefined;
  return { Authorization: `Bearer ${token}` };
}

// Game types
export interface Game {
  id: string;
  ownerAccountId: string;
  keyword: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  currency: string;
  state: 'draft' | 'active' | 'live' | 'ended' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// Checkout types
export interface CheckoutRequest {
  viewerEmail: string;
  viewerPhone?: string;
  returnUrl?: string;
}

export interface CheckoutResponse {
  purchaseId: string;
  checkoutUrl: string;
}

// Purchase processing/status types
export interface PurchaseProcessRequest {
  sourceId: string;
}

export interface PurchaseProcessResponse {
  purchaseId: string;
  status: 'created' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  entitlementToken?: string;
}

export interface PurchaseStatusResponse {
  purchaseId: string;
  status: 'created' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  entitlementToken?: string;
}

// Admin types (SupportAdmin / SuperAdmin)
export interface AdminLoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
}

export interface AdminAccount {
  id: string;
  email: string;
  role: 'support_admin' | 'super_admin';
}

export interface AdminLoginResponse {
  adminAccount: AdminAccount;
  sessionToken: string;
  mfaRequired: boolean;
}

export interface AdminMfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface AdminMfaVerifyRequest {
  token: string;
}

export interface AdminMfaVerifyResponse {
  success: boolean;
}

export interface AdminSearchResults {
  viewers?: Array<{
    id: string;
    email: string;
    phoneE164?: string;
    purchaseCount?: number;
  }>;
  games?: Array<{
    id: string;
    title: string;
    keywordCode: string;
    ownerAccountName?: string;
  }>;
  purchases?: Array<{
    id: string;
    gameId: string;
    gameTitle: string;
    viewerId: string;
    viewerEmail: string;
    amountCents: number;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminPurchaseTimelineResponse {
  purchaseId: string;
  purchase: {
    id: string;
    gameId: string;
    gameTitle: string;
    viewerId: string;
    viewerEmail: string;
    viewerEmailMasked?: string;
    amountCents: number;
    status: string;
    createdAt: string;
    paidAt?: string;
  };
  events: Array<{
    type: string;
    timestamp: string;
    description: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface AdminGameAudienceResponse {
  gameId: string;
  purchasers: Array<{
    purchaseId: string;
    emailMasked: string;
    purchasedAt: string;
    amountCents: number;
    watched: boolean;
  }>;
  watchers: Array<{
    purchaseId: string;
    emailMasked: string;
    sessionCount: number;
    lastWatchedAt?: string;
    totalWatchMs?: number;
  }>;
  purchaseToWatchConversionRate: number;
}

// Watch types
export interface WatchBootstrapResponse {
  streamUrl: string;
  playerType: 'hls' | 'embed';
  state: 'not_started' | 'live' | 'ended' | 'unavailable';
  validTo: string;
  gameInfo: {
    title?: string;
    startsAt?: string;
  };
  protectionLevel?: 'strong' | 'moderate' | 'best_effort';
}

export interface WatchCreateSessionRequest {
  metadata?: Record<string, unknown>;
}

export interface WatchCreateSessionResponse {
  sessionId: string;
  startedAt: string;
}

export type TelemetryEventType = 'buffer' | 'error' | 'play' | 'pause' | 'seek' | 'quality_change';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: number;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface WatchSubmitTelemetryRequest {
  events: TelemetryEvent[];
}

export interface WatchEndSessionRequest {
  totalWatchMs: number;
  totalBufferMs: number;
  bufferEvents: number;
  fatalErrors: number;
  startupLatencyMs?: number;
  streamDownMs?: number;
}

export interface WatchEndSessionResponse {
  sessionId: string;
  endedAt?: string;
  totalWatchMs?: number;
  totalBufferMs?: number;
  bufferEvents?: number;
  fatalErrors?: number;
}

// API client methods
export const apiClient = {
  /**
   * Get game by ID
   */
  async getGame(gameId: string): Promise<Game> {
    return apiRequest<Game>(`/api/public/games/${gameId}`);
  },

  /**
   * Create checkout
   */
  async createCheckout(
    gameId: string,
    data: CheckoutRequest
  ): Promise<CheckoutResponse> {
    return apiRequest<CheckoutResponse>(`/api/public/games/${gameId}/checkout`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Process a purchase payment (Square sourceId -> entitlement token)
   */
  async processPurchasePayment(
    purchaseId: string,
    data: PurchaseProcessRequest
  ): Promise<PurchaseProcessResponse> {
    return apiRequest<PurchaseProcessResponse>(`/api/public/purchases/${purchaseId}/process`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Poll purchase status (used by success page)
   */
  async getPurchaseStatus(purchaseId: string): Promise<PurchaseStatusResponse> {
    return apiRequest<PurchaseStatusResponse>(`/api/public/purchases/${purchaseId}/status`);
  },

  /**
   * Admin login (returns sessionToken)
   */
  async adminLogin(data: AdminLoginRequest): Promise<AdminLoginResponse> {
    return apiRequest<AdminLoginResponse>(`/api/admin/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin MFA setup (requires admin session token)
   */
  async adminMfaSetup(sessionToken: string): Promise<AdminMfaSetupResponse> {
    return apiRequest<AdminMfaSetupResponse>(`/api/admin/mfa/setup`, {
      method: 'POST',
      headers: {
        ...withBearerToken(sessionToken),
      },
    });
  },

  /**
   * Admin MFA verify (requires admin session token)
   */
  async adminMfaVerify(sessionToken: string, data: AdminMfaVerifyRequest): Promise<AdminMfaVerifyResponse> {
    return apiRequest<AdminMfaVerifyResponse>(`/api/admin/mfa/verify`, {
      method: 'POST',
      headers: {
        ...withBearerToken(sessionToken),
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin search (requires admin session token)
   */
  async adminSearch(sessionToken: string, q: string): Promise<AdminSearchResults> {
    return apiRequest<AdminSearchResults>(`/api/admin/search?q=${encodeURIComponent(q)}`, {
      headers: {
        ...withBearerToken(sessionToken),
      },
    });
  },

  /**
   * Admin purchase timeline (requires admin session token)
   */
  async adminGetPurchaseTimeline(sessionToken: string, purchaseId: string): Promise<AdminPurchaseTimelineResponse> {
    return apiRequest<AdminPurchaseTimelineResponse>(`/api/admin/purchases/${purchaseId}`, {
      headers: {
        ...withBearerToken(sessionToken),
      },
    });
  },

  /**
   * Admin game audience (requires admin session token)
   */
  async adminGetGameAudience(
    sessionToken: string,
    ownerId: string,
    gameId: string
  ): Promise<AdminGameAudienceResponse> {
    return apiRequest<AdminGameAudienceResponse>(`/api/admin/owners/${ownerId}/games/${gameId}/audience`, {
      headers: {
        ...withBearerToken(sessionToken),
      },
    });
  },

  /**
   * Get watch bootstrap by entitlement token
   */
  async getWatchBootstrap(token: string): Promise<WatchBootstrapResponse> {
    return apiRequest<WatchBootstrapResponse>(`/api/public/watch/${encodeURIComponent(token)}`);
  },

  /**
   * Create a playback session for entitlement token
   */
  async createWatchSession(
    token: string,
    data: WatchCreateSessionRequest = {}
  ): Promise<WatchCreateSessionResponse> {
    return apiRequest<WatchCreateSessionResponse>(`/api/public/watch/${encodeURIComponent(token)}/sessions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Submit telemetry events for a playback session
   */
  async submitWatchTelemetry(
    token: string,
    sessionId: string,
    data: WatchSubmitTelemetryRequest
  ): Promise<void> {
    await apiRequest<unknown>(
      `/api/public/watch/${encodeURIComponent(token)}/telemetry?sessionId=${encodeURIComponent(sessionId)}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * End a playback session with telemetry summary
   */
  async endWatchSession(
    token: string,
    sessionId: string,
    data: WatchEndSessionRequest
  ): Promise<WatchEndSessionResponse> {
    return apiRequest<WatchEndSessionResponse>(
      `/api/public/watch/${encodeURIComponent(token)}/sessions/${encodeURIComponent(sessionId)}/end`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },
};
