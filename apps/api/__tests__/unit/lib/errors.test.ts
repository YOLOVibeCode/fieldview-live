import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  formatErrorResponse,
} from '@/lib/errors';

describe('Error Classes', () => {
  it('AppError creates error with code and statusCode', () => {
    const error = new AppError('TEST_ERROR', 'Test message', 400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(400);
  });

  it('NotFoundError has correct defaults', () => {
    const error = new NotFoundError();
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });

  it('BadRequestError has correct defaults', () => {
    const error = new BadRequestError();
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.statusCode).toBe(400);
  });

  it('UnauthorizedError has correct defaults', () => {
    const error = new UnauthorizedError();
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
  });

  it('ForbiddenError has correct defaults', () => {
    const error = new ForbiddenError();
    expect(error.code).toBe('FORBIDDEN');
    expect(error.statusCode).toBe(403);
  });
});

describe('formatErrorResponse', () => {
  it('formats AppError correctly', () => {
    const error = new BadRequestError('Invalid input', { field: 'email' });
    const response = formatErrorResponse(error);
    
    expect(response.error.code).toBe('BAD_REQUEST');
    expect(response.error.message).toBe('Invalid input');
    expect(response.error.details).toEqual({ field: 'email' });
  });

  it('formats unknown error correctly', () => {
    const error = new Error('Unknown error');
    const response = formatErrorResponse(error);
    
    expect(response.error.code).toBe('INTERNAL_ERROR');
    expect(response.error.message).toBe('An unexpected error occurred');
  });
});
