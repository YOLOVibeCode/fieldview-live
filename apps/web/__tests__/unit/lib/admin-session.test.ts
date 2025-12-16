import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearAdminSessionToken, getAdminSessionToken, setAdminSessionToken } from '@/lib/admin-session';

describe('admin-session', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
  });

  it('stores and retrieves session token', () => {
    expect(getAdminSessionToken()).toBeNull();
    setAdminSessionToken('admin_session_123');
    expect(getAdminSessionToken()).toBe('admin_session_123');
    clearAdminSessionToken();
    expect(getAdminSessionToken()).toBeNull();
  });
});


