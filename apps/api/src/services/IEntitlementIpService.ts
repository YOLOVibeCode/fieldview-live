/**
 * Entitlement IP Locking Service Interfaces (ISP)
 *
 * Manages IP-locked stream access for purchased entitlements.
 * One purchase = one household (same IP can watch multiple times).
 */

/**
 * Grace period for IP changes (WiFi → LTE switching)
 * 15 minutes allows for network transitions
 */
export const IP_LOCK_GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Reasons for access denial
 */
export type AccessDeniedReason =
  | 'invalid_token'
  | 'expired'
  | 'ip_locked'
  | 'grace_period_expired'
  | 'purchase_not_found'
  | 'not_paid';

/**
 * Input for access validation
 */
export interface AccessCheckInput {
  purchaseId: string;
  ipAddress: string;
  token?: string; // Entitlement token (optional if checking by purchaseId)
}

/**
 * Result of access validation
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason: AccessDeniedReason | null;
  ipLocked: boolean;
  ipUpdated: boolean;
  gracePeriodActive: boolean;
  streamUrl?: string; // Provided on success
}

/**
 * IP lock status
 */
export interface IpLockStatus {
  purchaseId: string;
  lockedIpAddress: string | null;
  lockedAt: Date | null;
  lastAccessedAt: Date | null;
  lastAccessedIp: string | null;
  isWithinGracePeriod: boolean;
}

/**
 * IEntitlementIpChecker - Read operations for IP-locked access
 */
export interface IEntitlementIpChecker {
  /**
   * Validate stream access with IP checking
   * First access locks IP, subsequent must match or be in grace period
   */
  validateAccess(input: AccessCheckInput): Promise<AccessCheckResult>;

  /**
   * Check if IP change is within grace period
   */
  isWithinGracePeriod(purchaseId: string): Promise<boolean>;

  /**
   * Get current locked IP for a purchase
   */
  getLockedIp(purchaseId: string): Promise<string | null>;

  /**
   * Get full IP lock status
   */
  getIpLockStatus(purchaseId: string): Promise<IpLockStatus | null>;
}

/**
 * IEntitlementIpManager - Write operations for IP locking
 */
export interface IEntitlementIpManager {
  /**
   * Lock purchase to an IP address (first access)
   */
  lockToIp(purchaseId: string, ipAddress: string): Promise<void>;

  /**
   * Update locked IP (during grace period transition)
   */
  updateLockedIp(purchaseId: string, newIpAddress: string): Promise<void>;

  /**
   * Record access attempt (updates lastAccessedAt/Ip)
   */
  recordAccess(purchaseId: string, ipAddress: string): Promise<void>;

  /**
   * Clear IP lock (admin function, for support cases)
   */
  clearIpLock(purchaseId: string): Promise<void>;
}

/**
 * Combined interface for full service
 */
export interface IEntitlementIpService extends IEntitlementIpChecker, IEntitlementIpManager {}
