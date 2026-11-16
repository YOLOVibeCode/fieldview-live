import { describe, expect, it } from 'vitest';

import { CreateOwnerDirectStreamSchema } from '@/schemas/ownerDirectStream';
import { UpdateDirectStreamSettingsSchema } from '@/schemas/directStream';

describe('list price Zod schemas', () => {
  it('accepts free (0) and minimum paid (100)', () => {
    expect(
      UpdateDirectStreamSettingsSchema.safeParse({
        password: 'secret',
        priceInCents: 0,
      }).success,
    ).toBe(true);
    expect(
      UpdateDirectStreamSettingsSchema.safeParse({
        password: 'secret',
        priceInCents: 100,
      }).success,
    ).toBe(true);
  });

  it('rejects 99¢', () => {
    const result = UpdateDirectStreamSettingsSchema.safeParse({
      password: 'secret',
      priceInCents: 99,
    });
    expect(result.success).toBe(false);
  });

  it('rejects sub-dollar paid price on owner create', () => {
    const base = {
      slug: 'my-stream',
      title: 'Title',
      adminPassword: 'password1',
      priceInCents: 50,
    };
    expect(CreateOwnerDirectStreamSchema.safeParse(base).success).toBe(false);
    expect(
      CreateOwnerDirectStreamSchema.safeParse({ ...base, priceInCents: 100 })
        .success,
    ).toBe(true);
  });
});
