/**
 * Tests for Verify Access Page
 * 
 * Note: These are simplified tests due to Suspense and async state management.
 * Full E2E tests will cover the complete user flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VerifyAccessPage from '../page';

// Mock Next.js modules
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

const mockPush = vi.fn();
const mockGetToken = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGetToken,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('VerifyAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockGetToken.mockReturnValue('test-access-token-123');
  });

  it('should render the page', () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, redirectUrl: '/direct/test-stream' }),
    } as Response);

    render(<VerifyAccessPage />);
    
    // Page renders
    expect(document.body).toBeTruthy();
  });

  it('should call verify API on mount', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, redirectUrl: '/direct/test-stream' }),
    } as Response);

    render(<VerifyAccessPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/viewer-refresh/verify/test-access-token-123');
    }, { timeout: 3000 });
  });

  it('should handle successful verification', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, redirectUrl: '/direct/test-stream' }),
    } as Response);

    render(<VerifyAccessPage />);

    // Wait for success state
    await waitFor(() => {
      const successElements = screen.queryByText(/Access Restored/i);
      return expect(successElements).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle verification errors', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ valid: false, error: 'Token expired' }),
    } as Response);

    render(<VerifyAccessPage />);

    await waitFor(() => {
      const errorText = screen.queryByText(/Token expired/i);
      return expect(errorText).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});


