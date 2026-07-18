/**
 * Notify-Me Service Interfaces (ISP)
 *
 * Lightweight "notify me when the stream starts" signup.
 * Simpler than full registration — collects only email + consent.
 */

import type { ViewerIdentity, DirectStream, DirectStreamRegistration } from '@prisma/client';

// ========================================
// Input / Output types
// ========================================

export interface NotifyMeInput {
  email: string;
  slug: string;
}

/** Input for subscribing by existing viewer identity (authenticated user). */
export interface NotifyMeInputById {
  slug: string;
  viewerIdentityId: string;
}

export interface NotifyMeResult {
  status: 'subscribed' | 'already_subscribed';
  viewerId: string;
}

export interface CheckSubscriptionResult {
  subscribed: boolean;
}

export interface UnsubscribeResult {
  status: 'unsubscribed' | 'not_found';
}

// ========================================
// Reader interfaces (query-only)
// ========================================

/**
 * Reads viewer identity by email or id
 */
export interface INotifyMeViewerReader {
  /**
   * Find a viewer identity by email address.
   */
  getByEmail(email: string): Promise<ViewerIdentity | null>;
  /**
   * Find a viewer identity by id.
   */
  getById(id: string): Promise<ViewerIdentity | null>;
}

/**
 * Reads direct stream by slug
 */
export interface INotifyMeStreamReader {
  /**
   * Find a direct stream by slug.
   */
  getBySlug(slug: string): Promise<DirectStream | null>;
}

/**
 * Checks existing registrations
 */
export interface INotifyMeRegistrationChecker {
  /**
   * Check if a viewer is already registered for a stream with reminders enabled.
   */
  getExistingRegistration(
    streamId: string,
    viewerIdentityId: string,
  ): Promise<DirectStreamRegistration | null>;
}

// ========================================
// Writer interfaces (mutations)
// ========================================

/**
 * Creates viewer identities
 */
export interface INotifyMeViewerWriter {
  /**
   * Create a new viewer identity with wantsReminders=true.
   */
  createViewer(email: string): Promise<ViewerIdentity>;
}

/**
 * Creates stream registrations
 */
export interface INotifyMeRegistrationWriter {
  /**
   * Create a new registration for a viewer on a stream with wantsReminders=true.
   */
  createRegistration(
    streamId: string,
    viewerIdentityId: string,
  ): Promise<DirectStreamRegistration>;
}

/**
 * Updates existing registrations (e.g. set wantsReminders).
 */
export interface INotifyMeRegistrationUpdater {
  /**
   * Set wantsReminders on the registration; returns null if not found.
   */
  setWantsReminders(
    streamId: string,
    viewerIdentityId: string,
    value: boolean,
  ): Promise<DirectStreamRegistration | null>;
}

// ========================================
// Combined service interface
// ========================================

/**
 * Handles the lightweight "notify me" signup flow:
 * 1. Find or create ViewerIdentity by email (or by id when authenticated)
 * 2. Find DirectStream by slug
 * 3. Check if already registered
 * 4. Create registration with wantsReminders=true
 */
export interface INotifyMeService {
  subscribe(input: NotifyMeInput): Promise<NotifyMeResult>;
  /** Subscribe by existing viewer identity id (authenticated user). */
  subscribeById(input: NotifyMeInputById): Promise<NotifyMeResult>;
  /** Check if viewer is already subscribed to reminders for this stream. */
  checkSubscription(slug: string, viewerIdentityId: string): Promise<CheckSubscriptionResult>;
  /** Unsubscribe from reminders (set wantsReminders=false). */
  unsubscribe(input: NotifyMeInputById): Promise<UnsubscribeResult>;
}
