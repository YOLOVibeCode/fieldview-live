import { describe, it, expect } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';

describe('Health Endpoint', () => {
  it('returns 200 with status ok and uptime', async () => {
    const request: SuperTest<typeof app> = agent(app);
    const response = await request.get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });
});
