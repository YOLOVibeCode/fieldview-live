/**
 * NotifyMeService
 *
 * Lightweight "notify me when the stream starts" signup.
 * Find-or-create a ViewerIdentity, then register them for the stream
 * with wantsReminders=true.
 */

import type {
  INotifyMeService,
  INotifyMeViewerReader,
  INotifyMeStreamReader,
  INotifyMeRegistrationChecker,
  INotifyMeViewerWriter,
  INotifyMeRegistrationWriter,
  INotifyMeRegistrationUpdater,
  NotifyMeInput,
  NotifyMeInputById,
  NotifyMeResult,
  CheckSubscriptionResult,
  UnsubscribeResult,
} from './notify-me.interfaces';

export class NotifyMeService implements INotifyMeService {
  constructor(
    private readonly viewerReader: INotifyMeViewerReader,
    private readonly streamReader: INotifyMeStreamReader,
    private readonly registrationChecker: INotifyMeRegistrationChecker,
    private readonly viewerWriter: INotifyMeViewerWriter,
    private readonly registrationWriter: INotifyMeRegistrationWriter,
    private readonly registrationUpdater: INotifyMeRegistrationUpdater,
  ) {}

  async subscribe(input: NotifyMeInput): Promise<NotifyMeResult> {
    const email = input.email.trim().toLowerCase();

    if (!email) {
      throw new Error('Email is required');
    }

    // 1. Find stream by slug
    const stream = await this.streamReader.getBySlug(input.slug);
    if (!stream) {
      throw new Error(`Stream not found: ${input.slug}`);
    }

    // 2. Find or create viewer
    let viewer = await this.viewerReader.getByEmail(email);
    if (!viewer) {
      viewer = await this.viewerWriter.createViewer(email);
    }

    // 3. Check if already registered
    const existing = await this.registrationChecker.getExistingRegistration(
      stream.id,
      viewer.id,
    );
    if (existing) {
      return { status: 'already_subscribed', viewerId: viewer.id };
    }

    // 4. Create registration
    await this.registrationWriter.createRegistration(stream.id, viewer.id);

    return { status: 'subscribed', viewerId: viewer.id };
  }

  async subscribeById(input: NotifyMeInputById): Promise<NotifyMeResult> {
    if (!input.viewerIdentityId) {
      throw new Error('Viewer identity id is required');
    }

    const stream = await this.streamReader.getBySlug(input.slug);
    if (!stream) {
      throw new Error(`Stream not found: ${input.slug}`);
    }

    const viewer = await this.viewerReader.getById(input.viewerIdentityId);
    if (!viewer) {
      throw new Error('Viewer not found');
    }

    const existing = await this.registrationChecker.getExistingRegistration(
      stream.id,
      viewer.id,
    );
    if (existing) {
      return { status: 'already_subscribed', viewerId: viewer.id };
    }

    await this.registrationWriter.createRegistration(stream.id, viewer.id);
    return { status: 'subscribed', viewerId: viewer.id };
  }

  async checkSubscription(slug: string, viewerIdentityId: string): Promise<CheckSubscriptionResult> {
    const stream = await this.streamReader.getBySlug(slug);
    if (!stream) {
      throw new Error(`Stream not found: ${slug}`);
    }
    const existing = await this.registrationChecker.getExistingRegistration(
      stream.id,
      viewerIdentityId,
    );
    return { subscribed: !!existing?.wantsReminders };
  }

  async unsubscribe(input: NotifyMeInputById): Promise<UnsubscribeResult> {
    if (!input.viewerIdentityId) {
      throw new Error('Viewer identity id is required');
    }

    const stream = await this.streamReader.getBySlug(input.slug);
    if (!stream) {
      throw new Error(`Stream not found: ${input.slug}`);
    }

    const updated = await this.registrationUpdater.setWantsReminders(
      stream.id,
      input.viewerIdentityId,
      false,
    );
    return { status: updated ? 'unsubscribed' : 'not_found' };
  }
}
