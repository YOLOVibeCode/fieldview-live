import { describe, it, expect } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';

describe('Health Endpoint', () => {
  it('returns healthy when dependencies are reachable, otherwise unhealthy', async () => {
    const request: SuperTest<typeof app> = agent(app);
    const response = await request.get('/health');

    const expectHealthy = Boolean(process.env.DATABASE_URL) && Boolean(process.env.REDIS_URL);

    expect(response.status).toBe(expectHealthy ? 200 : 503);
    expect(response.body.status).toBe(expectHealthy ? 'healthy' : 'unhealthy');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.checks).toBeDefined();
    expect(response.body.checks.database).toBeDefined();
    expect(response.body.checks.redis).toBeDefined();
  });
});
