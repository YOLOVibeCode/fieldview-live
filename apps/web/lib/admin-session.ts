/**
 * Admin session utilities
 *
 * Stores the admin session token client-side and exposes helpers for API calls.
 * Note: backend currently accepts bearer session tokens (placeholder). When we
 * migrate to cookie-based sessions, this file will be updated accordingly.
 */

const ADMIN_SESSION_TOKEN_KEY = 'fieldview.admin.sessionToken';

export function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
}

export function setAdminSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_SESSION_TOKEN_KEY, token);
}

export function clearAdminSessionToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
}


