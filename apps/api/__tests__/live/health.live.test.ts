import { describe, it, expect } from 'vitest';
import { agent, type SuperTest } from 'supertest';
import app from '@/server';
import { prisma } from '@/lib/prisma';

function assertLiveTestEnv(): void {
  if (process.env.LIVE_TEST_MODE !== '1') {
    throw new Error(
      'LIVE tests require LIVE_TEST_MODE=1 and a dedicated DATABASE_URL/REDIS_URL. Refusing to run.'
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('LIVE tests require DATABASE_URL to be set (use a dedicated test database).');
  }

  // Safety: prevent accidental production runs
  const url = process.env.DATABASE_URL.toLowerCase();
  if (url.includes('prod') || url.includes('production')) {
    throw new Error('Refusing to run LIVE tests against a production DATABASE_URL.');
  }
}

describe('LIVE: Health + DB connectivity', () => {
  it('GET /api/health returns healthy and DB is reachable', async () => {
    assertLiveTestEnv();

    // DB connectivity check (real database)
    await prisma.$queryRaw`SELECT 1`;

    const request: SuperTest<typeof app> = agent(app);
    const response = await request.get('/api/health').expect(200);
    expect(response.body.status).toBe('healthy');
  });
});


