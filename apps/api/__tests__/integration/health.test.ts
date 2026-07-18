import { describe, it, expect } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';

describe('Health Endpoint', () => {
  it('returns healthy or unhealthy with correct structure', async () => {
    const request: SuperTest<typeof app> = agent(app);
    const response = await request.get('/health');

    // In test env, DB/Redis may not be reachable — accept either status
    expect([200, 503]).toContain(response.status);
    expect(['healthy', 'unhealthy']).toContain(response.body.status);
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.checks).toBeDefined();
    expect(response.body.checks.database).toBeDefined();
    expect(response.body.checks.redis).toBeDefined();
  });
});
