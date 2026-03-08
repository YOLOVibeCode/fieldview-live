/**
 * Typed API Client
 * 
 * Client for making API requests to the backend.
 * Types will be generated from OpenAPI spec.
 * 
 * Enhanced with retry logic and exponential backoff for transient failures.
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

interface ApiRequestOptions extends RequestInit {
  retries?: number;
}

/**
 * Check if an HTTP status code or error is retryable
 */
function isRetryable(statusOrError: number | Error): boolean {
  // Network errors are retryable
  if (statusOrError instanceof Error) return true;
  
  // 502 Bad Gateway and 503 Service Unavailable are retryable
  if (statusOrError === 502 || statusOrError === 503) return true;
  
  // 4xx client errors are NOT retryable
  if (statusOrError >= 400 && statusOrError < 500) return false;
  
  // 500 and 501 are NOT retryable (server bugs, not transient)
  if (statusOrError === 500 || statusOrError === 501) return false;
  
  // Other 5xx errors are retryable
  if (statusOrError >= 500) return true;
  
  return false;
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  // 100ms * 2^attempt = 100ms, 200ms, 400ms, 800ms, etc.
  return Math.min(100 * Math.pow(2, attempt), 3200);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function apiRequest<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  const { retries = 0, ...fetchOptions } = options || {};
  const url = `${API_URL}${endpoint}`;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const apiError = new ApiError(
          response.status,
          error.error?.code || 'UNKNOWN_ERROR',
          error.error?.message || 'An error occurred',
          error.error?.details
        );
        
        // Check if we should retry
        if (attempt < retries && isRetryable(response.status)) {
          lastError = apiError;
          await sleep(getRetryDelay(attempt));
          continue;
        }
        
        throw apiError;
      }

      return response.json();
    } catch (err) {
      // Network error or fetch failure
      if (err instanceof ApiError) {
        throw err; // Already handled above
      }
      
      const networkError = new ApiError(
        0,
        'NETWORK_ERROR',
        err instanceof Error ? err.message : 'Network request failed',
        { originalError: err }
      );
      
      // Check if we should retry
      if (attempt < retries && isRetryable(networkError)) {
        lastError = networkError;
        await sleep(getRetryDelay(attempt));
        continue;
      }
      
      throw networkError;
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new ApiError(0, 'UNKNOWN_ERROR', 'Request failed after retries');
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
  couponCode?: string;
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

export interface Purchase {
  id: string;
  amountCents: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  viewerEmail?: string;
}

export interface SavedPaymentMethod {
  id: string;
  cardBrand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
}

export interface SavedPaymentMethodsResponse {
  paymentMethods: SavedPaymentMethod[];
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

export interface RevenueByMonth {
  month: string;
  platformFeeCents: number;
  processorFeeCents: number;
  grossCents: number;
  purchaseCount: number;
}

export interface TopOwner {
  ownerAccountId: string;
  name: string;
  contactEmail: string;
  platformFeeCents: number;
  grossCents: number;
  purchaseCount: number;
}

export interface PlatformRevenueResponse {
  totalPlatformRevenueCents: number;
  totalProcessorFeeCents: number;
  totalGrossRevenueCents: number;
  totalPurchases: number;
  thisMonthRevenueCents: number;
  thisWeekRevenueCents: number;
  revenueByMonth: RevenueByMonth[];
  topOwners: TopOwner[];
}

// Coupon types
export interface CouponValidationRequest {
  code: string;
  gameId?: string;
  viewerEmail: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  discountCents?: number;
  discountType?: 'percentage' | 'fixed_cents';
  discountValue?: number;
  error?: string;
}

export interface CouponCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed_cents';
  discountValue: number;
  ownerAccountId?: string | null;
  gameId?: string | null;
  maxUses?: number | null;
  usedCount: number;
  maxUsesPerViewer: number;
  minPurchaseCents?: number | null;
  validFrom: string;
  validTo?: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface CouponListResponse {
  coupons: CouponCode[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateCouponRequest {
  code: string;
  discountType: 'percentage' | 'fixed_cents';
  discountValue: number;
  ownerAccountId?: string | null;
  gameId?: string | null;
  maxUses?: number | null;
  maxUsesPerViewer?: number;
  minPurchaseCents?: number | null;
  validFrom?: string;
  validTo?: string | null;
}

export interface UpdateCouponRequest {
  status?: 'active' | 'disabled';
  maxUses?: number | null;
  validTo?: string | null;
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
   * Create checkout for watch link channel
   */
  async createChannelCheckout(
    orgShortName: string,
    teamSlug: string,
    data: CheckoutRequest
  ): Promise<CheckoutResponse> {
    return apiRequest<CheckoutResponse>(`/api/public/watch-links/${encodeURIComponent(orgShortName)}/${encodeURIComponent(teamSlug)}/checkout`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Subscribe to notifications
   */
  async subscribe(data: {
    email: string;
    phoneE164?: string;
    organizationId?: string;
    channelId?: string;
    eventId?: string;
    preference?: 'email' | 'sms' | 'both';
  }): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/public/subscriptions`, {
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
   * Get purchase details
   */
  async getPurchase(purchaseId: string): Promise<Purchase> {
    return apiRequest<Purchase>(`/api/public/purchases/${purchaseId}`);
  },

  /**
   * Get saved payment methods for a purchase (scoped to the purchase recipient owner).
   */
  async getSavedPaymentMethods(purchaseId: string): Promise<SavedPaymentMethodsResponse> {
    return apiRequest<SavedPaymentMethodsResponse>(
      `/api/public/saved-payments?purchaseId=${encodeURIComponent(purchaseId)}`
    );
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
   * Admin platform revenue stats (requires admin session token)
   */
  async adminGetPlatformRevenue(sessionToken: string): Promise<PlatformRevenueResponse> {
    return apiRequest<PlatformRevenueResponse>(`/api/admin/platform/revenue`, {
      headers: {
        ...withBearerToken(sessionToken),
      },
    });
  },

  /**
   * Validate a coupon code for a game purchase
   */
  async validateCoupon(data: CouponValidationRequest): Promise<CouponValidationResponse> {
    return apiRequest<CouponValidationResponse>(`/api/public/coupons/validate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin list coupons (requires admin session token)
   */
  async adminListCoupons(
    sessionToken: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<CouponListResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const query = params.toString();
    return apiRequest<CouponListResponse>(`/api/admin/coupons${query ? `?${query}` : ''}`, {
      headers: {
        ...withBearerToken(sessionToken),
      },
    });
  },

  /**
   * Admin create coupon (requires admin session token)
   */
  async adminCreateCoupon(sessionToken: string, data: CreateCouponRequest): Promise<CouponCode> {
    return apiRequest<CouponCode>(`/api/admin/coupons`, {
      method: 'POST',
      headers: {
        ...withBearerToken(sessionToken),
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin get coupon details (requires admin session token)
   */
  async adminGetCoupon(sessionToken: string, couponId: string): Promise<CouponCode> {
    return apiRequest<CouponCode>(`/api/admin/coupons/${couponId}`, {
      headers: {
        ...withBearerToken(sessionToken),
      },
    });
  },

  /**
   * Admin update coupon (requires admin session token)
   */
  async adminUpdateCoupon(sessionToken: string, couponId: string, data: UpdateCouponRequest): Promise<CouponCode> {
    return apiRequest<CouponCode>(`/api/admin/coupons/${couponId}`, {
      method: 'PATCH',
      headers: {
        ...withBearerToken(sessionToken),
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin delete (disable) coupon (requires admin session token)
   */
  async adminDeleteCoupon(sessionToken: string, couponId: string): Promise<void> {
    await apiRequest<void>(`/api/admin/coupons/${couponId}`, {
      method: 'DELETE',
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
