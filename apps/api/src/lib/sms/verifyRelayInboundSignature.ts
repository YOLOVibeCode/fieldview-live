import crypto from 'crypto';

function relayInboundSecret(): string {
  return process.env.RELAY_INBOUND_SECRET || '';
}

export function isRelayInboundVerificationSkipped(): boolean {
  if (relayInboundSecret()) {
    return false;
  }
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || process.env.NODE_ENV !== 'production';
}

export function assertRelayInboundConfigured(): void {
  if (!relayInboundSecret() && process.env.NODE_ENV === 'production') {
    throw new ServiceUnavailableRelay();
  }
}

export class ServiceUnavailableRelay extends Error {
  readonly statusCode = 503;
  constructor() {
    super('RELAY_INBOUND_SECRET is not configured');
    this.name = 'ServiceUnavailableRelay';
  }
}

export function verifyRelayInboundSignature(
  publicUrl: string,
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
): boolean {
  const secret = relayInboundSecret();
  if (!secret) {
    return isRelayInboundVerificationSkipped();
  }
  if (!signatureHeader) {
    return false;
  }
  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(publicUrl + body)
    .digest('base64');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
