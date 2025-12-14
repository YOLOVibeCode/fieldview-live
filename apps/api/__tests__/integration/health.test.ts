import { describe, it, expect } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';

describe('Health Endpoint', () => {
  it('returns 200 with healthy status', async () => {
    const request: SuperTest<typeof app> = agent(app);
    const response = await request.get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.timestamp).toBeDefined();
  });
});
