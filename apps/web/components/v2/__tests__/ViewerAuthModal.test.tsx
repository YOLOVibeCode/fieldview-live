/**
 * ViewerAuthModal Component Tests
 *
 * Tests open/close, form validation, onRegister, loading/error states, default values, ARIA.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ViewerAuthModal } from '../auth/ViewerAuthModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onRegister: vi.fn(),
};

describe('ViewerAuthModal', () => {
  beforeEach(() => {
    defaultProps.onClose.mockClear();
    defaultProps.onRegister.mockClear();
  });

  describe('open/close', () => {
    it('should render form when isOpen is true', () => {
      render(<ViewerAuthModal {...defaultProps} />);
      expect(screen.getByTestId('form-viewer-register')).toBeInTheDocument();
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
    });

    it('should not render form when isOpen is false', () => {
      render(<ViewerAuthModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('form-viewer-register')).not.toBeInTheDocument();
    });

  });

  describe('form validation', () => {
    it('should show name required when name empty', async () => {
      const user = userEvent.setup();
      render(<ViewerAuthModal {...defaultProps} />);
      await user.type(screen.getByTestId('input-email'), 'a@b.com');
      fireEvent.click(screen.getByTestId('btn-submit-viewer-register'));
      expect(screen.getByTestId('error-name')).toHaveTextContent(/required/i);
    });

    it('should show email required when email empty', async () => {
      const user = userEvent.setup();
      render(<ViewerAuthModal {...defaultProps} />);
      await user.type(screen.getByTestId('input-name'), 'Jane');
      fireEvent.click(screen.getByTestId('btn-submit-viewer-register'));
      expect(screen.getByTestId('error-email')).toHaveTextContent(/required/i);
    });

    it('should show invalid email for bad format and not call onRegister', async () => {
      render(<ViewerAuthModal {...defaultProps} />);
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'notanemail' } });
      fireEvent.submit(screen.getByTestId('form-viewer-register'));
      expect(defaultProps.onRegister).not.toHaveBeenCalled();
      const errorEl = await screen.findByTestId('error-email', { timeout: 1000 });
      expect(errorEl).toHaveTextContent(/valid email/i);
    });

    it('should show name too short when less than 2 chars', async () => {
      const user = userEvent.setup();
      render(<ViewerAuthModal {...defaultProps} />);
      await user.type(screen.getByTestId('input-name'), 'J');
      await user.type(screen.getByTestId('input-email'), 'a@b.com');
      fireEvent.blur(screen.getByTestId('input-name'));
      expect(screen.getByTestId('error-name')).toHaveTextContent(/at least 2/i);
    });
  });

  describe('onRegister', () => {
    it('should call onRegister with email and name on valid submit', async () => {
      const user = userEvent.setup();
      render(<ViewerAuthModal {...defaultProps} />);
      await user.type(screen.getByTestId('input-name'), 'Jane Doe');
      await user.type(screen.getByTestId('input-email'), 'jane@example.com');
      fireEvent.click(screen.getByTestId('btn-submit-viewer-register'));
      expect(defaultProps.onRegister).toHaveBeenCalledWith('jane@example.com', 'Jane Doe');
    });
  });

  describe('loading state', () => {
    it('should show Registering... and disable submit when isLoading', () => {
      render(<ViewerAuthModal {...defaultProps} isLoading />);
      expect(screen.getByTestId('btn-submit-viewer-register')).toHaveTextContent('Registering...');
      expect(screen.getByTestId('btn-submit-viewer-register')).toBeDisabled();
    });

    it('should disable inputs when isLoading', () => {
      render(<ViewerAuthModal {...defaultProps} isLoading />);
      expect(screen.getByTestId('input-name')).toBeDisabled();
      expect(screen.getByTestId('input-email')).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('should show error message when error prop set', () => {
      render(<ViewerAuthModal {...defaultProps} error="Something went wrong" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    });
  });

  describe('default values', () => {
    it('should pre-fill defaultEmail and defaultName', () => {
      render(
        <ViewerAuthModal
          {...defaultProps}
          defaultEmail="pre@example.com"
          defaultName="Pre Name"
        />,
      );
      expect(screen.getByTestId('input-email')).toHaveValue('pre@example.com');
      expect(screen.getByTestId('input-name')).toHaveValue('Pre Name');
    });
  });

  describe('accessibility', () => {
    it('should have form with data-testid', () => {
      render(<ViewerAuthModal {...defaultProps} />);
      expect(screen.getByTestId('form-viewer-register')).toBeInTheDocument();
    });

    it('should have aria-label on submit button', () => {
      render(<ViewerAuthModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /register to chat/i })).toBeInTheDocument();
    });

    it('should have labels for name and email', () => {
      render(<ViewerAuthModal {...defaultProps} />);
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
  });
});
