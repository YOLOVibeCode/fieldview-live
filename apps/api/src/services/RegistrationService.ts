/**
 * Registration Service Implementation
 * 
 * Handles DirectStream viewer registration with email verification.
 */

import type {
  IRegistrationService,
  RegisterForStreamInput,
  RegistrationResult,
  RegistrationSummary,
} from './IRegistrationService';
import type {
  IDirectStreamRegistrationReader,
  IDirectStreamRegistrationWriter,
} from '../repositories/IDirectStreamRegistrationRepository';
import type {
  IViewerIdentityReader,
  IViewerIdentityWriter,
} from '../repositories/IViewerIdentityRepository';
import type { IEmailVerificationService } from './IEmailVerificationService';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

export class RegistrationService implements IRegistrationService {
  constructor(
    private registrationReader: IDirectStreamRegistrationReader,
    private registrationWriter: IDirectStreamRegistrationWriter,
    private viewerReader: IViewerIdentityReader,
    private viewerWriter: IViewerIdentityWriter,
    private verificationService: IEmailVerificationService
  ) {}

  async registerForStream(
    streamId: string,
    input: RegisterForStreamInput
  ): Promise<RegistrationResult> {
    // Step 1: Upsert ViewerIdentity
    let viewer = await this.viewerReader.getByEmail(input.email);

    if (!viewer) {
      viewer = await this.viewerWriter.create({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      logger.info({ viewerId: viewer.id, email: input.email }, 'New ViewerIdentity created');
    }

    // Step 2: Upsert DirectStreamRegistration
    let registration = await this.registrationReader.findByStreamAndViewer(streamId, viewer.id);

    if (!registration) {
      registration = await this.registrationWriter.create({
        directStreamId: streamId,
        viewerIdentityId: viewer.id,
        wantsReminders: input.wantsReminders ?? false,
      });
      logger.info(
        { registrationId: registration.id, streamId, viewerId: viewer.id },
        'DirectStreamRegistration created'
      );
    }

    // Step 3: Issue verification token (even if already registered, to support resend)
    const { token } = await this.verificationService.issueToken(viewer.id, streamId);

    // Step 4: Fetch stream title for email
    const stream = await prisma.directStream.findUnique({
      where: { id: streamId },
      select: { title: true },
    });

    if (!stream) {
      throw new Error(`DirectStream ${streamId} not found`);
    }

    // Step 5: Send verification email
    await this.verificationService.sendVerificationEmail(
      viewer.id,
      streamId,
      token,
      stream.title
    );

    logger.info(
      { viewerId: viewer.id, email: input.email, streamId },
      'Registration complete - verification email sent'
    );

    return {
      status: viewer.emailVerifiedAt ? 'already_verified' : 'verification_required',
      viewerId: viewer.id,
      registrationId: registration.id,
    };
  }

  async resendVerification(streamId: string, email: string): Promise<void> {
    const viewer = await this.viewerReader.getByEmail(email);
    if (!viewer) {
      throw new Error(`Viewer with email ${email} not found`);
    }

    // Fetch stream title
    const stream = await prisma.directStream.findUnique({
      where: { id: streamId },
      select: { title: true },
    });

    if (!stream) {
      throw new Error(`DirectStream ${streamId} not found`);
    }

    // Issue new token
    const { token } = await this.verificationService.issueToken(viewer.id, streamId);

    // Send email
    await this.verificationService.sendVerificationEmail(viewer.id, streamId, token, stream.title);

    logger.info({ viewerId: viewer.id, email, streamId }, 'Verification email resent');
  }

  async getRegistrationsByStream(streamId: string): Promise<RegistrationSummary[]> {
    const registrations = await this.registrationReader.findByStream(streamId);

    return registrations.map((reg) => ({
      id: reg.id,
      email: reg.viewerIdentity.email,
      firstName: reg.viewerIdentity.firstName,
      lastName: reg.viewerIdentity.lastName,
      isVerified: !!reg.verifiedAt,
      verifiedAt: reg.verifiedAt,
      wantsReminders: reg.wantsReminders,
      lastSeenAt: reg.lastSeenAt,
      registeredAt: reg.registeredAt,
    }));
  }
}

