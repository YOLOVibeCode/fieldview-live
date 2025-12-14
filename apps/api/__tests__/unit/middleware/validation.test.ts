import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validateRequest } from '@/middleware/validation';
import { BadRequestError } from '@/lib/errors';

describe('validateRequest', () => {
  it('validates request body', () => {
    const schema = z.object({
      email: z.string().email(),
    });
    
    const middleware = validateRequest({ body: schema });
    const req = {
      body: { email: 'test@example.com' },
    } as any;
    const res = {} as any;
    const next = vi.fn();
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalledWith();
    expect(req.body.email).toBe('test@example.com');
  });

  it('rejects invalid body', () => {
    const schema = z.object({
      email: z.string().email(),
    });
    
    const middleware = validateRequest({ body: schema });
    const req = {
      body: { email: 'invalid-email' },
    } as any;
    const res = {} as any;
    const next = vi.fn();
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.code).toBe('BAD_REQUEST');
  });
});
