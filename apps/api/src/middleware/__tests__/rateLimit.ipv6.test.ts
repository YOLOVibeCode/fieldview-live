import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * express-rate-limit checks each custom keyGenerator when a limiter is built. A key made from
 * `req.ip` without its `ipKeyGenerator` helper lets an IPv6 client step past the limit by
 * changing addresses inside its own block, and the library reports that with console.error.
 */
describe('rate limiters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('build every IP-based key through ipKeyGenerator', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.resetModules();

    await import('../rateLimit');

    const ipv6Reports = errorSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === 'object' &&
          arg !== null &&
          (arg as { code?: unknown }).code === 'ERR_ERL_KEY_GEN_IPV6'
      )
    );
    expect(ipv6Reports).toHaveLength(0);
  });
});
