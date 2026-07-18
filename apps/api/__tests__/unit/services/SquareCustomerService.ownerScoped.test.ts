import { describe, it, expect, vi } from 'vitest';
import { SquareCustomerService } from '@/services/SquareCustomerService';

describe('SquareCustomerService (owner-scoped mapping)', () => {
  it('lists saved payment methods using ViewerSquareCustomer mapping', async () => {
    const prisma = {
      viewerSquareCustomer: {
        findUnique: vi.fn().mockResolvedValue({ squareCustomerId: 'cust-1' }),
      },
    } as any;

    const cardsApi = {
      listCards: vi.fn().mockResolvedValue({
        result: {
          cards: [{ id: 'card-1', cardBrand: 'VISA', last4: '1111', expMonth: 12, expYear: 2030 }],
        },
      }),
    };

    const squareClient = { cards: cardsApi } as any;

    const svc = new SquareCustomerService(prisma);
    const methods = await svc.listSavedPaymentMethodsForOwner({
      ownerAccountId: 'owner-1',
      viewerId: 'viewer-1',
      squareClient,
    });

    expect(prisma.viewerSquareCustomer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerAccountId_viewerId: { ownerAccountId: 'owner-1', viewerId: 'viewer-1' } },
      })
    );
    expect(cardsApi.listCards).toHaveBeenCalledWith({ customerId: 'cust-1' });
    expect(methods).toEqual([
      { id: 'card-1', cardBrand: 'VISA', last4: '1111', expMonth: 12, expYear: 2030 },
    ]);
  });
});


