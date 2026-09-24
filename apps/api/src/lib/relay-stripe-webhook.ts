/**
 * Helpers for resolving purchases from relay-forwarded Stripe webhook payloads.
 */

const PURCHASE_NOTE_RE = /FieldView purchase ([0-9a-f-]{36})/i;

export function purchaseIdFromNote(note: string | undefined | null): string | null {
  if (!note) return null;
  const match = PURCHASE_NOTE_RE.exec(note);
  return match?.[1] ?? null;
}

export function readMetadataString(
  metadata: Record<string, unknown> | undefined | null,
  key: string,
): string | null {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function extractPurchaseIdFromStripeObject(obj: Record<string, unknown>): string | null {
  const clientRef = obj.client_reference_id;
  if (typeof clientRef === 'string' && clientRef.length > 0) {
    return clientRef;
  }

  const metadata = obj.metadata as Record<string, unknown> | undefined;
  const fromMeta =
    readMetadataString(metadata, 'purchaseId') ??
    readMetadataString(metadata, 'reference_id') ??
    readMetadataString(metadata, 'referenceId');
  if (fromMeta) {
    return fromMeta;
  }

  const fromDescription =
    typeof obj.description === 'string' ? purchaseIdFromNote(obj.description) : null;
  if (fromDescription) {
    return fromDescription;
  }
  return typeof obj.note === 'string' ? purchaseIdFromNote(obj.note) : null;
}
