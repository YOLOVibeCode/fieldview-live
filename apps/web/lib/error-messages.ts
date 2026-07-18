import { ApiError } from './api-client';

const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission for this action.",
  NOT_FOUND: 'The requested resource was not found.',
  BAD_REQUEST: 'Something was wrong with the request. Please check your input.',
  CONFLICT: 'This resource already exists.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

const STATUS_MESSAGES: Record<number, string> = {
  0: 'Unable to connect. Please check your internet connection.',
  400: 'Invalid request. Please check your input.',
  401: 'Please sign in to continue.',
  403: "You don't have permission for this action.",
  404: 'Not found.',
  409: 'This already exists.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Something went wrong. Please try again.',
  502: 'Server temporarily unavailable. Please try again.',
  503: 'Service temporarily unavailable. Please try again.',
};

export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] || STATUS_MESSAGES[error.status] || error.message;
  }
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return STATUS_MESSAGES[0];
    }
    return error.message;
  }
  return 'An unexpected error occurred.';
}
