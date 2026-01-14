/**
 * PasswordInput Component Tests
 * 
 * TDD: Password input with show/hide toggle
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '../PasswordInput';

describe('PasswordInput', () => {
  describe('rendering', () => {
    it('should render input field', () => {
      render(<PasswordInput name="password" />);
      const input = screen.getByLabelText(/password/i);
      expect(input).toBeInTheDocument();
    });
    
    it('should be type password by default', () => {
      render(<PasswordInput name="password" />);
      const input = screen.getByLabelText(/password/i);
      expect(input).toHaveAttribute('type', 'password');
    });
    
    it('should have custom label', () => {
      render(<PasswordInput name="password" label="Enter Password" />);
      expect(screen.getByLabelText('Enter Password')).toBeInTheDocument();
    });
    
    it('should have custom placeholder', () => {
      render(<PasswordInput name="password" placeholder="Your password..." />);
      expect(screen.getByPlaceholderText('Your password...')).toBeInTheDocument();
    });
  });
  
  describe('show/hide toggle', () => {
    it('should show toggle button', () => {
      render(<PasswordInput name="password" />);
      expect(screen.getByLabelText(/show password/i)).toBeInTheDocument();
    });
    
    it('should toggle password visibility', () => {
      render(<PasswordInput name="password" />);
      const input = screen.getByLabelText(/password/i);
      const toggle = screen.getByLabelText(/show password/i);
      
      // Initially hidden
      expect(input).toHaveAttribute('type', 'password');
      
      // Click to show
      fireEvent.click(toggle);
      expect(input).toHaveAttribute('type', 'text');
      
      // Click to hide again
      fireEvent.click(toggle);
      expect(input).toHaveAttribute('type', 'password');
    });
    
    it('should change button label when showing', () => {
      render(<PasswordInput name="password" />);
      const toggle = screen.getByLabelText(/show password/i);
      
      fireEvent.click(toggle);
      expect(screen.getByLabelText(/hide password/i)).toBeInTheDocument();
    });
  });
  
  describe('error state', () => {
    it('should show error message', () => {
      render(<PasswordInput name="password" error="Password is required" />);
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
    
    it('should apply error styles', () => {
      render(<PasswordInput name="password" error="Error" data-testid="password-input" />);
      const container = screen.getByTestId('password-input');
      expect(container).toHaveClass('error');
    });
  });
  
  describe('disabled state', () => {
    it('should disable input', () => {
      render(<PasswordInput name="password" disabled />);
      const input = screen.getByLabelText(/password/i);
      expect(input).toBeDisabled();
    });
    
    it('should disable toggle button', () => {
      render(<PasswordInput name="password" disabled />);
      const toggle = screen.getByLabelText(/show password/i);
      expect(toggle).toBeDisabled();
    });
  });
  
  describe('onChange callback', () => {
    it('should call onChange with value', () => {
      const handleChange = jest.fn();
      render(<PasswordInput name="password" onChange={handleChange} />);
      const input = screen.getByLabelText(/password/i);
      
      fireEvent.change(input, { target: { value: 'secret123' } });
      expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({ value: 'secret123' })
      }));
    });
  });
  
  describe('accessibility', () => {
    it('should have proper input-error association', () => {
      render(<PasswordInput name="password" error="Error message" />);
      const input = screen.getByLabelText(/password/i);
      const error = screen.getByText('Error message');
      
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
      expect(error).toHaveAttribute('id', expect.stringContaining('error'));
    });
    
    it('should have aria-invalid when error', () => {
      render(<PasswordInput name="password" error="Error" />);
      const input = screen.getByLabelText(/password/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});

