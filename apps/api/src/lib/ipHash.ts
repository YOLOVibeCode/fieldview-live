/**
 * IP hashing helper
 *
 * Hashes an IP address for binding checks without storing raw IPs.
 */

import { createHmac } from 'crypto';

export function hashIp(ip: string, secret: string): string {
  const normalized = ip.trim().toLowerCase();
  return createHmac('sha256', secret).update(normalized).digest('hex');
}


