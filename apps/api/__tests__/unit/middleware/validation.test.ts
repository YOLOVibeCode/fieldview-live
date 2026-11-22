import { StartCoachTextLinkSchema } from '@fieldview/data-model';
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

  it('rejects invalid input for a schema from the shared data-model package', () => {
    // That package can bring its own loaded copy of zod (it does under the test runner),
    // and its ZodError is then not an instance of the class this middleware imports.
    const middleware = validateRequest({ body: StartCoachTextLinkSchema });
    const req = {
      body: { phone: '' },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.details.errors[0].path).toEqual(['phone']);
  });

  it('passes on an error that is not a validation failure', () => {
    const boom = new Error('boom');
    const schema = z.string().transform(() => {
      throw boom;
    });

    const middleware = validateRequest({ body: schema });
    const req = {
      body: 'anything',
    } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('passes on an error that only carries the name of a validation failure', () => {
    const impostor = Object.assign(new Error('not from zod'), { name: 'ZodError' });
    const schema = z.string().transform(() => {
      throw impostor;
    });

    const middleware = validateRequest({ body: schema });
    const req = {
      body: 'anything',
    } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(impostor);
  });
});
