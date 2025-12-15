/**
 * Typed API Client
 * 
 * Client for making API requests to the backend.
 * Types will be generated from OpenAPI spec.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
};
