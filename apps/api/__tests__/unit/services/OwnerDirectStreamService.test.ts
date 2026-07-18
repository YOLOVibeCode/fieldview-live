/**
 * OwnerDirectStreamService Unit Tests (TDD)
 *
 * Tests written BEFORE implementation to drive design.
 * Uses mock implementations of ISP interfaces.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DirectStream } from '@prisma/client';
import type {
  IOwnerDirectStreamReader,
  IOwnerDirectStreamWriter,
  ICreateOwnerDirectStreamInput,
  IUpdateOwnerDirectStreamInput,
  IListOwnerDirectStreamsFilters,
  IOwnerDirectStreamSummary,
} from '../../../src/repositories/IOwnerDirectStreamRepository';
import { OwnerDirectStreamService } from '../../../src/services/OwnerDirectStreamService';

// ==================== MOCK IMPLEMENTATIONS ====================

function makeDirectStream(overrides: Partial<DirectStream> = {}): DirectStream {
  return {
    id: overrides.id ?? `stream-${Date.now()}`,
    slug: overrides.slug ?? 'test-stream',
    title: overrides.title ?? 'Test Stream',
    ownerAccountId: overrides.ownerAccountId ?? 'owner-123',
    streamUrl: overrides.streamUrl ?? null,
    scheduledStartAt: overrides.scheduledStartAt ?? null,
    reminderSentAt: null,
    sendReminders: true,
    reminderMinutes: 5,
    paywallEnabled: overrides.paywallEnabled ?? false,
    priceInCents: overrides.priceInCents ?? 0,
    paywallMessage: overrides.paywallMessage ?? null,
    allowSavePayment: false,
    adminPassword: overrides.adminPassword ?? 'hashed-password',
    chatEnabled: overrides.chatEnabled ?? true,
    scoreboardEnabled: overrides.scoreboardEnabled ?? false,
    allowViewerScoreEdit: false,
    allowViewerNameEdit: false,
    allowAnonymousChat: false,
    allowAnonymousScoreEdit: false,
    allowAnonymousView: overrides.allowAnonymousView ?? true,
    requireEmailVerification: overrides.requireEmailVerification ?? true,
    listed: overrides.listed ?? true,
    scoreboardHomeTeam: overrides.scoreboardHomeTeam ?? null,
    scoreboardAwayTeam: overrides.scoreboardAwayTeam ?? null,
    scoreboardHomeColor: overrides.scoreboardHomeColor ?? null,
    scoreboardAwayColor: overrides.scoreboardAwayColor ?? null,
    welcomeMessage: null,
    status: overrides.status ?? 'active',
    archivedAt: null,
    deletedAt: null,
    autoPurgeAt: null,
    gameId: overrides.gameId ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

class MockReader implements IOwnerDirectStreamReader {
  private streams: Map<string, DirectStream> = new Map();

  async getByIdForOwner(id: string, ownerAccountId: string) {
    const stream = this.streams.get(id);
    if (stream && stream.ownerAccountId === ownerAccountId) return stream;
    return null;
  }

  async getBySlugForOwner(slug: string, ownerAccountId: string) {
    for (const stream of this.streams.values()) {
      if (stream.slug === slug && stream.ownerAccountId === ownerAccountId) return stream;
    }
    return null;
  }

  async isSlugAvailable(slug: string) {
    for (const stream of this.streams.values()) {
      if (stream.slug === slug) return false;
    }
    return true;
  }

  async listForOwner(filters: IListOwnerDirectStreamsFilters): Promise<IOwnerDirectStreamSummary[]> {
    const results: IOwnerDirectStreamSummary[] = [];
    for (const stream of this.streams.values()) {
      if (stream.ownerAccountId !== filters.ownerAccountId) continue;
      if (filters.status && filters.status !== 'all' && stream.status !== filters.status) continue;
      results.push({
        id: stream.id,
        slug: stream.slug,
        title: stream.title,
        streamUrl: stream.streamUrl,
        scheduledStartAt: stream.scheduledStartAt,
        status: stream.status,
        paywallEnabled: stream.paywallEnabled,
        priceInCents: stream.priceInCents,
        chatEnabled: stream.chatEnabled,
        scoreboardEnabled: stream.scoreboardEnabled,
        listed: stream.listed,
        eventsCount: 0,
        registrationsCount: 0,
        createdAt: stream.createdAt,
      });
    }
    return results;
  }

  // Test helpers
  _addStream(stream: DirectStream) {
    this.streams.set(stream.id, stream);
  }
}

class MockWriter implements IOwnerDirectStreamWriter {
  public createdStreams: DirectStream[] = [];
  public updatedStreams: Map<string, DirectStream> = new Map();

  async create(input: ICreateOwnerDirectStreamInput): Promise<DirectStream> {
    const stream = makeDirectStream({
      id: `stream-${Date.now()}-${Math.random()}`,
      slug: input.slug,
      title: input.title,
      ownerAccountId: input.ownerAccountId,
      streamUrl: input.streamUrl ?? null,
      scheduledStartAt: input.scheduledStartAt ?? null,
      adminPassword: input.adminPassword,
      chatEnabled: input.chatEnabled ?? true,
      scoreboardEnabled: input.scoreboardEnabled ?? false,
      paywallEnabled: input.paywallEnabled ?? false,
      priceInCents: input.priceInCents ?? 0,
      paywallMessage: input.paywallMessage ?? null,
      allowAnonymousView: input.allowAnonymousView ?? true,
      requireEmailVerification: input.requireEmailVerification ?? true,
      listed: input.listed ?? true,
      scoreboardHomeTeam: input.scoreboardHomeTeam ?? null,
      scoreboardAwayTeam: input.scoreboardAwayTeam ?? null,
      scoreboardHomeColor: input.scoreboardHomeColor ?? null,
      scoreboardAwayColor: input.scoreboardAwayColor ?? null,
    });
    this.createdStreams.push(stream);
    return stream;
  }

  async update(id: string, input: IUpdateOwnerDirectStreamInput): Promise<DirectStream> {
    const existing = this.updatedStreams.get(id) ?? this.createdStreams.find((s) => s.id === id);
    if (!existing) throw new Error('Stream not found');
    const updated = { ...existing, ...input, updatedAt: new Date() } as DirectStream;
    this.updatedStreams.set(id, updated);
    return updated;
  }

  async archive(id: string): Promise<DirectStream> {
    return this.update(id, { } as IUpdateOwnerDirectStreamInput).then((s) => {
      const archived = { ...s, status: 'archived', archivedAt: new Date() };
      this.updatedStreams.set(id, archived);
      return archived;
    });
  }
}

// ==================== TESTS ====================

describe('OwnerDirectStreamService', () => {
  let reader: MockReader;
  let writer: MockWriter;
  let service: OwnerDirectStreamService;
  const ownerAccountId = 'owner-123';

  beforeEach(() => {
    reader = new MockReader();
    writer = new MockWriter();
    service = new OwnerDirectStreamService(reader, writer);
  });

  // ==================== CREATE ====================

  describe('createStream', () => {
    it('should create a DirectStream for the owner', async () => {
      const result = await service.createStream(ownerAccountId, {
        slug: 'my-stream',
        title: 'My Stream',
        adminPassword: 'securepassword123',
      });

      expect(result).toBeDefined();
      expect(result.slug).toBe('my-stream');
      expect(result.title).toBe('My Stream');
      expect(result.ownerAccountId).toBe(ownerAccountId);
      expect(result.status).toBe('active');
    });

    it('should reject invalid slug format', async () => {
      await expect(
        service.createStream(ownerAccountId, {
          slug: 'Invalid Slug!',
          title: 'Test',
          adminPassword: 'securepassword123',
        })
      ).rejects.toThrow('slug');
    });

    it('should reject slug with uppercase letters', async () => {
      await expect(
        service.createStream(ownerAccountId, {
          slug: 'MyStream',
          title: 'Test',
          adminPassword: 'securepassword123',
        })
      ).rejects.toThrow('slug');
    });

    it('should reject duplicate slug', async () => {
      reader._addStream(makeDirectStream({ slug: 'taken-slug', ownerAccountId: 'other-owner' }));

      await expect(
        service.createStream(ownerAccountId, {
          slug: 'taken-slug',
          title: 'Test',
          adminPassword: 'securepassword123',
        })
      ).rejects.toThrow('Slug');
    });

    it('should reject short admin password', async () => {
      await expect(
        service.createStream(ownerAccountId, {
          slug: 'my-stream',
          title: 'Test',
          adminPassword: 'short',
        })
      ).rejects.toThrow('password');
    });

    it('should apply default feature flags', async () => {
      const result = await service.createStream(ownerAccountId, {
        slug: 'defaults-stream',
        title: 'Defaults',
        adminPassword: 'securepassword123',
      });

      expect(result.chatEnabled).toBe(true);
      expect(result.scoreboardEnabled).toBe(false);
      expect(result.paywallEnabled).toBe(false);
      expect(result.listed).toBe(true);
    });

    it('should pass through optional feature flags', async () => {
      const result = await service.createStream(ownerAccountId, {
        slug: 'custom-stream',
        title: 'Custom',
        adminPassword: 'securepassword123',
        chatEnabled: false,
        scoreboardEnabled: true,
        paywallEnabled: true,
        priceInCents: 499,
      });

      expect(result.chatEnabled).toBe(false);
      expect(result.scoreboardEnabled).toBe(true);
      expect(result.paywallEnabled).toBe(true);
      expect(result.priceInCents).toBe(499);
    });

    it('should hash the admin password before storing', async () => {
      const result = await service.createStream(ownerAccountId, {
        slug: 'hashed-pw',
        title: 'Test',
        adminPassword: 'securepassword123',
      });

      // The stored password should NOT be the raw password
      expect(result.adminPassword).not.toBe('securepassword123');
    });
  });

  // ==================== GET ====================

  describe('getStream', () => {
    it('should return a stream owned by the requesting owner', async () => {
      const stream = makeDirectStream({ id: 'stream-1', slug: 'my-stream', ownerAccountId });
      reader._addStream(stream);

      const result = await service.getStream('stream-1', ownerAccountId);

      expect(result).toBeDefined();
      expect(result!.slug).toBe('my-stream');
    });

    it('should return null if stream belongs to another owner', async () => {
      const stream = makeDirectStream({ id: 'stream-1', ownerAccountId: 'other-owner' });
      reader._addStream(stream);

      const result = await service.getStream('stream-1', ownerAccountId);

      expect(result).toBeNull();
    });

    it('should return null for nonexistent stream', async () => {
      const result = await service.getStream('nonexistent', ownerAccountId);
      expect(result).toBeNull();
    });
  });

  // ==================== GET BY SLUG ====================

  describe('getStreamBySlug', () => {
    it('should return a stream by slug for the owner', async () => {
      const stream = makeDirectStream({ id: 'stream-1', slug: 'my-stream', ownerAccountId });
      reader._addStream(stream);

      const result = await service.getStreamBySlug('my-stream', ownerAccountId);

      expect(result).toBeDefined();
      expect(result!.id).toBe('stream-1');
    });

    it('should return null if slug belongs to another owner', async () => {
      const stream = makeDirectStream({ slug: 'other-stream', ownerAccountId: 'other-owner' });
      reader._addStream(stream);

      const result = await service.getStreamBySlug('other-stream', ownerAccountId);

      expect(result).toBeNull();
    });
  });

  // ==================== LIST ====================

  describe('listStreams', () => {
    it('should list streams for the owner', async () => {
      reader._addStream(makeDirectStream({ id: 's1', slug: 'stream-1', ownerAccountId }));
      reader._addStream(makeDirectStream({ id: 's2', slug: 'stream-2', ownerAccountId }));
      reader._addStream(makeDirectStream({ id: 's3', slug: 'other', ownerAccountId: 'other-owner' }));

      const result = await service.listStreams(ownerAccountId);

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.slug).sort()).toEqual(['stream-1', 'stream-2']);
    });

    it('should filter by status', async () => {
      reader._addStream(makeDirectStream({ id: 's1', slug: 'active-stream', ownerAccountId, status: 'active' }));
      reader._addStream(makeDirectStream({ id: 's2', slug: 'archived-stream', ownerAccountId, status: 'archived' }));

      const result = await service.listStreams(ownerAccountId, { status: 'active' });

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('active-stream');
    });

    it('should return empty array when owner has no streams', async () => {
      const result = await service.listStreams(ownerAccountId);
      expect(result).toEqual([]);
    });
  });

  // ==================== UPDATE ====================

  describe('updateStream', () => {
    it('should update an owned stream', async () => {
      const stream = makeDirectStream({ id: 'stream-1', slug: 'my-stream', ownerAccountId });
      reader._addStream(stream);
      writer.createdStreams.push(stream);

      const result = await service.updateStream('stream-1', ownerAccountId, {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw if stream not found for owner', async () => {
      await expect(
        service.updateStream('nonexistent', ownerAccountId, { title: 'Test' })
      ).rejects.toThrow('not found');
    });

    it('should throw if stream belongs to another owner', async () => {
      const stream = makeDirectStream({ id: 'stream-1', ownerAccountId: 'other-owner' });
      reader._addStream(stream);

      await expect(
        service.updateStream('stream-1', ownerAccountId, { title: 'Hijack' })
      ).rejects.toThrow('not found');
    });

    it('should allow updating feature flags', async () => {
      const stream = makeDirectStream({ id: 'stream-1', ownerAccountId, chatEnabled: true });
      reader._addStream(stream);
      writer.createdStreams.push(stream);

      const result = await service.updateStream('stream-1', ownerAccountId, {
        chatEnabled: false,
        scoreboardEnabled: true,
      });

      expect(result.chatEnabled).toBe(false);
      expect(result.scoreboardEnabled).toBe(true);
    });
  });

  // ==================== ARCHIVE ====================

  describe('archiveStream', () => {
    it('should archive an owned stream', async () => {
      const stream = makeDirectStream({ id: 'stream-1', ownerAccountId });
      reader._addStream(stream);
      writer.createdStreams.push(stream);

      const result = await service.archiveStream('stream-1', ownerAccountId);

      expect(result.status).toBe('archived');
    });

    it('should throw if stream not found for owner', async () => {
      await expect(service.archiveStream('nonexistent', ownerAccountId)).rejects.toThrow('not found');
    });

    it('should throw if stream belongs to another owner', async () => {
      const stream = makeDirectStream({ id: 'stream-1', ownerAccountId: 'other-owner' });
      reader._addStream(stream);

      await expect(service.archiveStream('stream-1', ownerAccountId)).rejects.toThrow('not found');
    });
  });
});
