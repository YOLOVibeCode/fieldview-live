/**
 * ViewerIdentityBar Component Tests
 *
 * Tests the viewer identity pill and sign-out action.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ViewerIdentityBar } from '../ViewerIdentityBar';

const mockClearViewerAuth = vi.fn();

vi.mock('@/hooks/useGlobalViewerAuth', () => ({
  useGlobalViewerAuth: vi.fn(),
}));

import { useGlobalViewerAuth } from '@/hooks/useGlobalViewerAuth';

describe('ViewerIdentityBar', () => {
  beforeEach(() => {
    vi.mocked(useGlobalViewerAuth).mockReturnValue({
      viewerName: null,
      viewerEmail: null,
      isAuthenticated: false,
      clearViewerAuth: mockClearViewerAuth,
      isLoading: true,
      viewerIdentityId: null,
      viewerFirstName: null,
      viewerLastName: null,
      setViewerAuth: vi.fn(),
    });
    mockClearViewerAuth.mockClear();
  });

  it('should render nothing when loading', () => {
    const { container } = render(<ViewerIdentityBar />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when not authenticated', () => {
    vi.mocked(useGlobalViewerAuth).mockReturnValue({
      viewerName: null,
      viewerEmail: null,
      isAuthenticated: false,
      clearViewerAuth: mockClearViewerAuth,
      isLoading: false,
      viewerIdentityId: null,
      viewerFirstName: null,
      viewerLastName: null,
      setViewerAuth: vi.fn(),
    });

    const { container } = render(<ViewerIdentityBar />);
    expect(container.firstChild).toBeNull();
  });

  it('should show viewer name and sign out when authenticated', () => {
    vi.mocked(useGlobalViewerAuth).mockReturnValue({
      viewerName: 'Jane Doe',
      viewerEmail: 'jane@example.com',
      isAuthenticated: true,
      clearViewerAuth: mockClearViewerAuth,
      isLoading: false,
      viewerIdentityId: 'v-1',
      viewerFirstName: 'Jane',
      viewerLastName: 'Doe',
      setViewerAuth: vi.fn(),
    });

    render(<ViewerIdentityBar />);

    expect(screen.getByTestId('viewer-identity-bar')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    const signOut = screen.getByTestId('btn-viewer-logout');
    expect(signOut).toHaveAttribute('aria-label', 'Sign out');

    fireEvent.click(signOut);
    expect(mockClearViewerAuth).toHaveBeenCalledTimes(1);
  });

  it('should show email when no viewer name', () => {
    vi.mocked(useGlobalViewerAuth).mockReturnValue({
      viewerName: 'alice@example.com',
      viewerEmail: 'alice@example.com',
      isAuthenticated: true,
      clearViewerAuth: mockClearViewerAuth,
      isLoading: false,
      viewerIdentityId: 'v-2',
      viewerFirstName: null,
      viewerLastName: null,
      setViewerAuth: vi.fn(),
    });

    render(<ViewerIdentityBar />);

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('btn-viewer-logout')).toBeInTheDocument();
  });

  it('should show "Guest" for anonymous viewer emails', () => {
    vi.mocked(useGlobalViewerAuth).mockReturnValue({
      viewerName: 'anon-abc123@guest.fieldview.live',
      viewerEmail: 'anon-abc123@guest.fieldview.live',
      isAuthenticated: true,
      clearViewerAuth: mockClearViewerAuth,
      isLoading: false,
      viewerIdentityId: 'v-3',
      viewerFirstName: null,
      viewerLastName: null,
      setViewerAuth: vi.fn(),
    });

    render(<ViewerIdentityBar />);

    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(screen.queryByText('anon-abc123@guest.fieldview.live')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-viewer-logout')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes for accessibility', () => {
    vi.mocked(useGlobalViewerAuth).mockReturnValue({
      viewerName: 'Jane',
      viewerEmail: 'jane@example.com',
      isAuthenticated: true,
      clearViewerAuth: mockClearViewerAuth,
      isLoading: false,
      viewerIdentityId: 'v-4',
      viewerFirstName: 'Jane',
      viewerLastName: null,
      setViewerAuth: vi.fn(),
    });

    render(<ViewerIdentityBar />);

    const bar = screen.getByTestId('viewer-identity-bar');
    expect(bar).toHaveAttribute('role', 'region');
    expect(bar).toHaveAttribute('aria-label', 'Viewer account');

    const signOut = screen.getByTestId('btn-viewer-logout');
    expect(signOut).toHaveAttribute('aria-label', 'Sign out');
    expect(signOut.tagName).toBe('BUTTON');
    expect(signOut).toHaveAttribute('type', 'button');
  });
});
