import { describe, it, expect, beforeEach } from 'vitest';
import { dataEventBus, DataEvents } from '@/lib/event-bus';

describe('DataEventBus', () => {
  beforeEach(() => {
    dataEventBus.clearAll();
  });

  it('emits and subscribes to events', () => {
    let receivedData: unknown = null;

    const unsubscribe = dataEventBus.subscribe(DataEvents.PURCHASE_CREATED, (data) => {
      receivedData = data;
    });

    dataEventBus.emit(DataEvents.PURCHASE_CREATED, { purchaseId: 'test-123' });

    expect(receivedData).toEqual({ purchaseId: 'test-123' });

    unsubscribe();
  });

  it('unsubscribes from events', () => {
    let callCount = 0;

    const unsubscribe = dataEventBus.subscribe(DataEvents.PURCHASE_CREATED, () => {
      callCount++;
    });

    dataEventBus.emit(DataEvents.PURCHASE_CREATED, {});
    expect(callCount).toBe(1);

    unsubscribe();
    dataEventBus.emit(DataEvents.PURCHASE_CREATED, {});
    expect(callCount).toBe(1); // Should not increment
  });

  it('handles multiple subscribers', () => {
    let callCount1 = 0;
    let callCount2 = 0;

    dataEventBus.subscribe(DataEvents.PURCHASE_CREATED, () => {
      callCount1++;
    });
    dataEventBus.subscribe(DataEvents.PURCHASE_CREATED, () => {
      callCount2++;
    });

    dataEventBus.emit(DataEvents.PURCHASE_CREATED, {});

    expect(callCount1).toBe(1);
    expect(callCount2).toBe(1);
  });
});
