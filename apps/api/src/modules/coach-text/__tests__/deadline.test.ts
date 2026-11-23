import { describe, expect, it } from 'vitest';

import { Deadline, raceWithin } from '../deadline';

describe('Deadline', () => {
  it('counts from the arrival of the text', () => {
    let now = 1_000;
    const deadline = new Deadline(1_000, 9_000, () => now);

    expect(deadline.atMs).toBe(10_000);
    expect(deadline.remainingMs()).toBe(9_000);
    now = 9_999;
    expect(deadline.passed()).toBe(false);
    now = 10_000;
    expect(deadline.passed()).toBe(true);
    expect(deadline.remainingMs()).toBe(0);
  });
});

describe('raceWithin', () => {
  it('gives the answer that comes in time', async () => {
    await expect(raceWithin(Promise.resolve(7), 50)).resolves.toEqual({ done: true, value: 7 });
  });

  it('stops waiting at the limit', async () => {
    const never = new Promise<number>(() => undefined);
    const started = Date.now();

    await expect(raceWithin(never, 20)).resolves.toEqual({ done: false });
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('does not wait at all when no time is left', async () => {
    await expect(raceWithin(new Promise<number>(() => undefined), 0)).resolves.toEqual({ done: false });
  });

  it('passes a failure through', async () => {
    await expect(raceWithin(Promise.reject(new Error('boom')), 50)).rejects.toThrow('boom');
  });
});
