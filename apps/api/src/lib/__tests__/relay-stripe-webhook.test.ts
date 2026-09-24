import { describe, it, expect } from 'vitest';

import { extractPurchaseIdFromStripeObject, purchaseIdFromNote } from '../relay-stripe-webhook';

describe('relay-stripe-webhook helpers', () => {
  it('parses purchase id from FieldView note', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(purchaseIdFromNote(`FieldView purchase ${id}`)).toBe(id);
  });

  it('extracts purchase id from client_reference_id', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(extractPurchaseIdFromStripeObject({ client_reference_id: id })).toBe(id);
  });

  it('extracts purchase id from metadata.purchaseId', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(extractPurchaseIdFromStripeObject({ metadata: { purchaseId: id } })).toBe(id);
  });
});
