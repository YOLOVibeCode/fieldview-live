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

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}@fieldview.live`;
}

describe('LIVE: public flow (no mocks, real DB)', () => {
  it('creates owner + game, exposes public game view, and creates checkout', async () => {
    assertLiveTestEnv();

    const request: SuperTest<typeof app> = agent(app);

    const email = uniqueEmail('owner');
    const password = 'password12345';

    // Register owner (real DB)
    const registerResp = await request
      .post('/api/owners/register')
      .send({
        email,
        password,
        name: 'Live Test Owner',
        type: 'individual',
      })
      .expect(201);

    expect(registerResp.body.token?.token).toBeTruthy();
    const ownerToken: string = registerResp.body.token.token;

    // Create game
    const gameResp = await request
      .post('/api/owners/games')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Live Test Game',
        homeTeam: 'Home',
        awayTeam: 'Away',
        startsAt: new Date(Date.now() + 60_000).toISOString(),
        priceCents: 700,
        currency: 'USD',
      })
      .expect(201);

    const gameId: string = gameResp.body.id;
    expect(gameId).toBeTruthy();

    // Activate game (so it is publicly purchasable)
    await request
      .patch(`/api/owners/games/${gameId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ state: 'active' })
      .expect(200);

    // Public game view should be available
    const publicGameResp = await request.get(`/api/public/games/${gameId}`).expect(200);
    expect(publicGameResp.body.id).toBe(gameId);

    // Create checkout (creates ViewerIdentity + Purchase)
    const checkoutResp = await request
      .post(`/api/public/games/${gameId}/checkout`)
      .send({ viewerEmail: uniqueEmail('viewer') })
      .expect(200);

    expect(checkoutResp.body.purchaseId).toBeTruthy();

    // Cleanup (best-effort)
    await prisma.purchase.deleteMany({ where: { gameId } });
    await prisma.game.delete({ where: { id: gameId } });
    await prisma.ownerUser.deleteMany({ where: { email } });
    await prisma.ownerAccount.delete({ where: { contactEmail: email } });
  });
});


