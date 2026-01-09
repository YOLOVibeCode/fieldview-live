/**
 * Registration Service Interface
 * 
 * Handles DirectStream viewer registration and verification flow.
 */

export interface RegisterForStreamInput {
  email: string;
  firstName: string;
  lastName: string;
  wantsReminders?: boolean;
}

export interface RegistrationResult {
  status: 'verification_required' | 'already_verified';
  viewerId: string;
  registrationId: string;
}

export interface RegistrationSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
  wantsReminders: boolean;
  lastSeenAt: Date | null;
  registeredAt: Date;
}

export interface IRegistrationService {
  /**
   * Register a viewer for a DirectStream
   * Creates ViewerIdentity if new, issues verification token, sends email
   */
  registerForStream(
    streamId: string,
    input: RegisterForStreamInput
  ): Promise<RegistrationResult>;

  /**
   * Resend verification email
   */
  resendVerification(streamId: string, email: string): Promise<void>;

  /**
   * Get all registrations for a stream
   */
  getRegistrationsByStream(streamId: string): Promise<RegistrationSummary[]>;
}

