/**
 * Owner DirectStream Service
 *
 * Business logic for owner-managed DirectStreams.
 * Receives ISP-segregated interfaces (Reader + Writer).
 */

import type { DirectStream } from '@prisma/client';
import type {
  IOwnerDirectStreamReader,
  IOwnerDirectStreamWriter,
  IOwnerDirectStreamSummary,
  IListOwnerDirectStreamsFilters,
} from '../repositories/IOwnerDirectStreamRepository';
import { hashPassword } from '../lib/encryption';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors';

export interface ICreateStreamRequest {
  slug: string;
  title: string;
  adminPassword: string;
  streamUrl?: string | null;
  scheduledStartAt?: Date | null;
  chatEnabled?: boolean;
  scoreboardEnabled?: boolean;
  paywallEnabled?: boolean;
  priceInCents?: number;
  paywallMessage?: string | null;
  allowAnonymousView?: boolean;
  requireEmailVerification?: boolean;
  listed?: boolean;
  scoreboardHomeTeam?: string | null;
  scoreboardAwayTeam?: string | null;
  scoreboardHomeColor?: string | null;
  scoreboardAwayColor?: string | null;
}

export class OwnerDirectStreamService {
  constructor(
    private reader: IOwnerDirectStreamReader,
    private writer: IOwnerDirectStreamWriter
  ) {}

  /**
   * Create a new DirectStream for an owner
   */
  async createStream(ownerAccountId: string, input: ICreateStreamRequest): Promise<DirectStream> {
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(input.slug)) {
      throw new BadRequestError('Invalid slug format: must be lowercase alphanumeric with hyphens');
    }

    // Validate admin password length
    if (input.adminPassword.length < 8) {
      throw new BadRequestError('Admin password must be at least 8 characters');
    }

    // Check slug availability
    const available = await this.reader.isSlugAvailable(input.slug);
    if (!available) {
      throw new ConflictError('Slug is already taken');
    }

    // Hash admin password
    const hashedPassword = await hashPassword(input.adminPassword);

    return this.writer.create({
      ownerAccountId,
      slug: input.slug,
      title: input.title,
      adminPassword: hashedPassword,
      streamUrl: input.streamUrl,
      scheduledStartAt: input.scheduledStartAt,
      chatEnabled: input.chatEnabled,
      scoreboardEnabled: input.scoreboardEnabled,
      paywallEnabled: input.paywallEnabled,
      priceInCents: input.priceInCents,
      paywallMessage: input.paywallMessage,
      allowAnonymousView: input.allowAnonymousView,
      requireEmailVerification: input.requireEmailVerification,
      listed: input.listed,
      scoreboardHomeTeam: input.scoreboardHomeTeam,
      scoreboardAwayTeam: input.scoreboardAwayTeam,
      scoreboardHomeColor: input.scoreboardHomeColor,
      scoreboardAwayColor: input.scoreboardAwayColor,
    });
  }

  /**
   * Get a DirectStream by ID, scoped to owner
   */
  async getStream(id: string, ownerAccountId: string): Promise<DirectStream | null> {
    return this.reader.getByIdForOwner(id, ownerAccountId);
  }

  /**
   * Get a DirectStream by slug, scoped to owner
   */
  async getStreamBySlug(slug: string, ownerAccountId: string): Promise<DirectStream | null> {
    return this.reader.getBySlugForOwner(slug, ownerAccountId);
  }

  /**
   * List DirectStreams for an owner
   */
  async listStreams(
    ownerAccountId: string,
    filters: Partial<Omit<IListOwnerDirectStreamsFilters, 'ownerAccountId'>> = {}
  ): Promise<IOwnerDirectStreamSummary[]> {
    return this.reader.listForOwner({
      ownerAccountId,
      ...filters,
    });
  }

  /**
   * Update an owned DirectStream
   */
  async updateStream(
    id: string,
    ownerAccountId: string,
    input: Partial<ICreateStreamRequest>
  ): Promise<DirectStream> {
    const existing = await this.reader.getByIdForOwner(id, ownerAccountId);
    if (!existing) {
      throw new NotFoundError('DirectStream not found');
    }

    // Strip fields that shouldn't be updated via this method
    const { slug: _slug, adminPassword: _pw, ...updateData } = input;

    return this.writer.update(id, updateData);
  }

  /**
   * Archive an owned DirectStream
   */
  async archiveStream(id: string, ownerAccountId: string): Promise<DirectStream> {
    const existing = await this.reader.getByIdForOwner(id, ownerAccountId);
    if (!existing) {
      throw new NotFoundError('DirectStream not found');
    }

    return this.writer.archive(id);
  }
}
