/**
 * ViewerIdentity Entity
 * 
 * Viewer is identified by email address (required).
 * Phone number is optional (used for SMS delivery).
 */

export interface ViewerIdentity {
  id: string;
  email: string; // Required for viewer identity and monitoring
  phoneE164?: string; // Optional, E.164 format
  smsOptOut: boolean;
  optOutAt?: Date;
  createdAt: Date;
  lastSeenAt?: Date;
}
