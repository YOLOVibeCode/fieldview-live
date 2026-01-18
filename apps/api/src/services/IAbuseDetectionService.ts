/**
 * Abuse Detection Service Interfaces (ISP)
 *
 * Detects and handles multi-account abuse via device fingerprinting.
 * Implements compassionate messaging with one-time pass system.
 */

/**
 * Abuse message levels for progressive response
 */
export type AbuseMessage =
  | 'none' // No abuse detected
  | 'first_warning' // 1 existing account found
  | 'abuse_detected' // 2+ accounts, one-time pass available
  | 'one_time_pass' // User accepted the pass
  | 'final_block'; // Pass already used, hard block

/**
 * Input for registration abuse check
 */
export interface RegistrationCheckInput {
  fingerprintHash: string;
  ipAddress: string;
  email: string;
}

/**
 * Result of registration abuse check
 */
export interface RegistrationCheckResult {
  allowed: boolean;
  linkedAccountCount: number;
  abuseDetected: boolean;
  oneTimePassAvailable: boolean;
  message: AbuseMessage;
}

/**
 * Masked account info (for display)
 */
export interface LinkedAccount {
  ownerAccountId: string;
  email: string; // Masked: j***@example.com
  registeredAt: Date;
}

/**
 * Input for recording fingerprint
 */
export interface RecordFingerprintInput {
  ownerAccountId: string;
  fingerprintHash: string;
  ipAddress: string;
}

/**
 * IAbuseDetector - Read operations for abuse detection
 */
export interface IAbuseDetector {
  /**
   * Check if registration should be allowed
   * Returns abuse status and available options
   */
  checkRegistration(input: RegistrationCheckInput): Promise<RegistrationCheckResult>;

  /**
   * Get accounts linked to a fingerprint
   * Emails are masked for privacy
   */
  getLinkedAccounts(fingerprintHash: string): Promise<LinkedAccount[]>;

  /**
   * Check if fingerprint has used one-time pass
   */
  hasUsedOneTimePass(fingerprintHash: string): Promise<boolean>;

  /**
   * Get fingerprint by hash (if exists)
   */
  getFingerprintByHash(
    fingerprintHash: string
  ): Promise<{ id: string; oneTimePassUsed: boolean; warningsShown: number } | null>;
}

/**
 * IAbuseRecorder - Write operations for abuse tracking
 */
export interface IAbuseRecorder {
  /**
   * Record a fingerprint for an account
   * Creates fingerprint record if doesn't exist
   */
  recordFingerprint(input: RecordFingerprintInput): Promise<void>;

  /**
   * Mark one-time pass as used (compassionate bypass)
   */
  useOneTimePass(fingerprintHash: string): Promise<void>;

  /**
   * Increment warning counter
   */
  incrementWarnings(fingerprintHash: string): Promise<void>;

  /**
   * Flag fingerprint for abuse
   */
  flagForAbuse(fingerprintHash: string, reason: string): Promise<void>;

  /**
   * Update last seen timestamp
   */
  updateLastSeen(fingerprintHash: string): Promise<void>;

  /**
   * Add IP to fingerprint's IP list
   */
  addIpAddress(fingerprintHash: string, ipAddress: string): Promise<void>;
}

/**
 * Combined interface for full service
 */
export interface IAbuseDetectionService extends IAbuseDetector, IAbuseRecorder {}

/**
 * Mask email for display (j***@example.com)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return '***@***';

  const firstChar = localPart[0] || '*';
  return `${firstChar}***@${domain}`;
}
