/**
 * Bookmark PubSub Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryBookmarkPubSub,
  type BookmarkEvent,
  getBookmarkPubSub,
  setBookmarkPubSub,
} from '../bookmark-pubsub';

describe('InMemoryBookmarkPubSub', () => {
  let pubsub: InMemoryBookmarkPubSub;

  beforeEach(() => {
    pubsub = new InMemoryBookmarkPubSub();
  });

  const sampleEvent: BookmarkEvent = {
    type: 'bookmark_created',
    bookmark: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      directStreamId: 'tchs',
      viewerIdentityId: '550e8400-e29b-41d4-a716-446655440001',
      timestampSeconds: 120,
      label: 'Great Goal!',
      isShared: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  describe('publish', () => {
    it('should broadcast to all subscribers for the same slug', () => {
      const received: BookmarkEvent[] = [];
      pubsub.subscribe('tchs', (data) => received.push(data));
      pubsub.subscribe('tchs', (data) => received.push(data));

      pubsub.publish('tchs', sampleEvent);

      expect(received).toHaveLength(2);
      expect(received[0]).toEqual(sampleEvent);
      expect(received[1]).toEqual(sampleEvent);
    });

    it('should not broadcast to subscribers of a different slug', () => {
      const received: BookmarkEvent[] = [];
      pubsub.subscribe('other-slug', (data) => received.push(data));

      pubsub.publish('tchs', sampleEvent);

      expect(received).toHaveLength(0);
    });

    it('should not throw when publishing with no subscribers', () => {
      expect(() => pubsub.publish('no-one-listening', sampleEvent)).not.toThrow();
    });

    it('should catch errors in subscriber handlers', () => {
      pubsub.subscribe('tchs', () => {
        throw new Error('handler error');
      });

      // Should not throw
      expect(() => pubsub.publish('tchs', sampleEvent)).not.toThrow();
    });
  });

  describe('subscribe', () => {
    it('should return an unsubscribe function', () => {
      const received: BookmarkEvent[] = [];
      const unsubscribe = pubsub.subscribe('tchs', (data) => received.push(data));

      pubsub.publish('tchs', sampleEvent);
      expect(received).toHaveLength(1);

      unsubscribe();

      pubsub.publish('tchs', sampleEvent);
      expect(received).toHaveLength(1); // No new events
    });

    it('should handle multiple subscriptions and selective unsubscription', () => {
      const received1: BookmarkEvent[] = [];
      const received2: BookmarkEvent[] = [];

      const unsub1 = pubsub.subscribe('tchs', (data) => received1.push(data));
      pubsub.subscribe('tchs', (data) => received2.push(data));

      unsub1();

      pubsub.publish('tchs', sampleEvent);

      expect(received1).toHaveLength(0);
      expect(received2).toHaveLength(1);
    });
  });

  describe('event types', () => {
    it('should support bookmark_created events', () => {
      const received: BookmarkEvent[] = [];
      pubsub.subscribe('tchs', (data) => received.push(data));

      pubsub.publish('tchs', { ...sampleEvent, type: 'bookmark_created' });

      expect(received[0].type).toBe('bookmark_created');
    });

    it('should support bookmark_deleted events', () => {
      const received: BookmarkEvent[] = [];
      pubsub.subscribe('tchs', (data) => received.push(data));

      pubsub.publish('tchs', { ...sampleEvent, type: 'bookmark_deleted' });

      expect(received[0].type).toBe('bookmark_deleted');
    });

    it('should support bookmark_updated events', () => {
      const received: BookmarkEvent[] = [];
      pubsub.subscribe('tchs', (data) => received.push(data));

      pubsub.publish('tchs', { ...sampleEvent, type: 'bookmark_updated' });

      expect(received[0].type).toBe('bookmark_updated');
    });

    it('should support stream_ended events', () => {
      const received: BookmarkEvent[] = [];
      pubsub.subscribe('tchs', (data) => received.push(data));

      pubsub.publish('tchs', { type: 'stream_ended' });

      expect(received[0].type).toBe('stream_ended');
      expect(received[0].bookmark).toBeUndefined();
    });
  });

  describe('singleton', () => {
    it('getBookmarkPubSub returns a singleton', () => {
      const instance1 = getBookmarkPubSub();
      const instance2 = getBookmarkPubSub();
      expect(instance1).toBe(instance2);
    });

    it('setBookmarkPubSub replaces the singleton', () => {
      const custom = new InMemoryBookmarkPubSub();
      setBookmarkPubSub(custom);
      expect(getBookmarkPubSub()).toBe(custom);
    });
  });

  describe('null viewerIdentityId', () => {
    it('should handle bookmarks with null viewerIdentityId', () => {
      const orphanedEvent: BookmarkEvent = {
        type: 'bookmark_created',
        bookmark: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          directStreamId: 'tchs',
          viewerIdentityId: null,
          timestampSeconds: 300,
          label: 'Orphaned Bookmark',
          isShared: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const received: BookmarkEvent[] = [];
      pubsub.subscribe('tchs', (data) => received.push(data));

      pubsub.publish('tchs', orphanedEvent);

      expect(received).toHaveLength(1);
      expect(received[0].bookmark?.viewerIdentityId).toBeNull();
    });
  });
});
