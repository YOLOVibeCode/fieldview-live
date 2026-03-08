import { describe, it, expect } from 'vitest';
import { getUserFriendlyMessage } from '../error-messages';
import { ApiError } from '../api-client';

describe('getUserFriendlyMessage', () => {
  describe('ApiError instances', () => {
    it('should map NETWORK_ERROR code to user-friendly message', () => {
      const error = new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
      expect(getUserFriendlyMessage(error)).toBe('Unable to connect. Please check your internet connection.');
    });

    it('should map UNAUTHORIZED code to user-friendly message', () => {
      const error = new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      expect(getUserFriendlyMessage(error)).toBe('Please sign in to continue.');
    });

    it('should map FORBIDDEN code to user-friendly message', () => {
      const error = new ApiError(403, 'FORBIDDEN', 'Insufficient permissions');
      expect(getUserFriendlyMessage(error)).toBe("You don't have permission for this action.");
    });

    it('should map NOT_FOUND code to user-friendly message', () => {
      const error = new ApiError(404, 'NOT_FOUND', 'Resource not found');
      expect(getUserFriendlyMessage(error)).toBe('The requested resource was not found.');
    });

    it('should map BAD_REQUEST code to user-friendly message', () => {
      const error = new ApiError(400, 'BAD_REQUEST', 'Invalid request');
      expect(getUserFriendlyMessage(error)).toBe('Something was wrong with the request. Please check your input.');
    });

    it('should map CONFLICT code to user-friendly message', () => {
      const error = new ApiError(409, 'CONFLICT', 'Resource already exists');
      expect(getUserFriendlyMessage(error)).toBe('This resource already exists.');
    });

    it('should map RATE_LIMIT code to user-friendly message', () => {
      const error = new ApiError(429, 'RATE_LIMIT', 'Too many requests');
      expect(getUserFriendlyMessage(error)).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('should map INTERNAL_ERROR code to user-friendly message', () => {
      const error = new ApiError(500, 'INTERNAL_ERROR', 'Internal server error');
      expect(getUserFriendlyMessage(error)).toBe('Something went wrong on our end. Please try again.');
    });

    it('should map UNKNOWN_ERROR code to user-friendly message', () => {
      const error = new ApiError(0, 'UNKNOWN_ERROR', 'Unknown error');
      expect(getUserFriendlyMessage(error)).toBe('An unexpected error occurred. Please try again.');
    });

    it('should fall back to status message for unknown error code', () => {
      const error = new ApiError(502, 'GATEWAY_ERROR', 'Bad gateway');
      expect(getUserFriendlyMessage(error)).toBe('Server temporarily unavailable. Please try again.');
    });

    it('should fall back to original message for unrecognized code and status', () => {
      const error = new ApiError(418, 'TEAPOT', "I'm a teapot");
      expect(getUserFriendlyMessage(error)).toBe("I'm a teapot");
    });
  });

  describe('Generic Error instances', () => {
    it('should map "Failed to fetch" to network error message', () => {
      const error = new Error('Failed to fetch');
      expect(getUserFriendlyMessage(error)).toBe('Unable to connect. Please check your internet connection.');
    });

    it('should return the error message for other Error instances', () => {
      const error = new Error('Custom error message');
      expect(getUserFriendlyMessage(error)).toBe('Custom error message');
    });
  });

  describe('Non-Error values', () => {
    it('should return generic message for unknown error types', () => {
      expect(getUserFriendlyMessage('string error')).toBe('An unexpected error occurred.');
    });

    it('should return generic message for null', () => {
      expect(getUserFriendlyMessage(null)).toBe('An unexpected error occurred.');
    });

    it('should return generic message for undefined', () => {
      expect(getUserFriendlyMessage(undefined)).toBe('An unexpected error occurred.');
    });
  });

  describe('Status code fallback mapping', () => {
    it('should map 0 status to network error', () => {
      const error = new ApiError(0, 'UNKNOWN', 'Network error');
      expect(getUserFriendlyMessage(error)).toBe('Unable to connect. Please check your internet connection.');
    });

    it('should map 400 status to invalid request', () => {
      const error = new ApiError(400, 'UNKNOWN', 'Bad request');
      expect(getUserFriendlyMessage(error)).toBe('Invalid request. Please check your input.');
    });

    it('should map 401 status to sign in required', () => {
      const error = new ApiError(401, 'UNKNOWN', 'Unauthorized');
      expect(getUserFriendlyMessage(error)).toBe('Please sign in to continue.');
    });

    it('should map 403 status to permission denied', () => {
      const error = new ApiError(403, 'UNKNOWN', 'Forbidden');
      expect(getUserFriendlyMessage(error)).toBe("You don't have permission for this action.");
    });

    it('should map 404 status to not found', () => {
      const error = new ApiError(404, 'UNKNOWN', 'Not found');
      expect(getUserFriendlyMessage(error)).toBe('Not found.');
    });

    it('should map 409 status to already exists', () => {
      const error = new ApiError(409, 'UNKNOWN', 'Conflict');
      expect(getUserFriendlyMessage(error)).toBe('This already exists.');
    });

    it('should map 429 status to too many requests', () => {
      const error = new ApiError(429, 'UNKNOWN', 'Rate limit');
      expect(getUserFriendlyMessage(error)).toBe('Too many requests. Please wait a moment.');
    });

    it('should map 500 status to generic server error', () => {
      const error = new ApiError(500, 'UNKNOWN', 'Internal error');
      expect(getUserFriendlyMessage(error)).toBe('Something went wrong. Please try again.');
    });

    it('should map 502 status to temporarily unavailable', () => {
      const error = new ApiError(502, 'UNKNOWN', 'Bad gateway');
      expect(getUserFriendlyMessage(error)).toBe('Server temporarily unavailable. Please try again.');
    });

    it('should map 503 status to service unavailable', () => {
      const error = new ApiError(503, 'UNKNOWN', 'Service unavailable');
      expect(getUserFriendlyMessage(error)).toBe('Service temporarily unavailable. Please try again.');
    });
  });
});
