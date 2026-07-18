/**
 * Bookmark Validation Tests
 * 
 * Tests for bookmark field length limits and validation
 */

import { describe, it, expect } from 'vitest';
import {
  createBookmarkSchema,
  updateBookmarkSchema,
  BOOKMARK_LIMITS,
} from '../dvrSchemas';

describe('Bookmark Validation', () => {
  describe('createBookmarkSchema', () => {
    const validBookmark = {
      viewerIdentityId: '550e8400-e29b-41d4-a716-446655440000',
      directStreamId: '550e8400-e29b-41d4-a716-446655440001',
      timestampSeconds: 120,
      label: 'Great play',
      notes: 'Amazing goal!',
      isShared: true,
    };

    it('should accept valid bookmark', () => {
      const result = createBookmarkSchema.safeParse(validBookmark);
      expect(result.success).toBe(true);
    });

    describe('label field', () => {
      it('should reject empty label', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          label: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Label is required');
        }
      });

      it('should reject label with only whitespace', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          label: '   ',
        });
        expect(result.success).toBe(false);
      });

      it('should accept label at max length (100 chars)', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          label: 'a'.repeat(BOOKMARK_LIMITS.LABEL_MAX),
        });
        expect(result.success).toBe(true);
      });

      it('should reject label over max length', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          label: 'a'.repeat(BOOKMARK_LIMITS.LABEL_MAX + 1),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('100 characters or less');
        }
      });

      it('should trim whitespace from label', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          label: '  Great play  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.label).toBe('Great play');
        }
      });
    });

    describe('notes field', () => {
      it('should accept undefined notes', () => {
        const { notes, ...bookmarkWithoutNotes } = validBookmark;
        const result = createBookmarkSchema.safeParse(bookmarkWithoutNotes);
        expect(result.success).toBe(true);
      });

      it('should accept empty notes', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          notes: '',
        });
        expect(result.success).toBe(true);
      });

      it('should accept notes at max length (500 chars)', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          notes: 'a'.repeat(BOOKMARK_LIMITS.NOTES_MAX),
        });
        expect(result.success).toBe(true);
      });

      it('should reject notes over max length', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          notes: 'a'.repeat(BOOKMARK_LIMITS.NOTES_MAX + 1),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('500 characters or less');
        }
      });

      it('should trim whitespace from notes', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          notes: '  Amazing goal!  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.notes).toBe('Amazing goal!');
        }
      });
    });

    describe('timestampSeconds field', () => {
      it('should accept valid timestamp', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          timestampSeconds: 1000,
        });
        expect(result.success).toBe(true);
      });

      it('should accept timestamp of 0', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          timestampSeconds: 0,
        });
        expect(result.success).toBe(true);
      });

      it('should reject negative timestamp', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          timestampSeconds: -1,
        });
        expect(result.success).toBe(false);
      });

      it('should accept timestamp at max (24 hours)', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          timestampSeconds: BOOKMARK_LIMITS.MAX_TIMESTAMP_SECONDS,
        });
        expect(result.success).toBe(true);
      });

      it('should reject timestamp over max', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          timestampSeconds: BOOKMARK_LIMITS.MAX_TIMESTAMP_SECONDS + 1,
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-integer timestamp', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          timestampSeconds: 120.5,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('gameId/directStreamId requirement', () => {
      it('should accept bookmark with gameId', () => {
        const { directStreamId, ...bookmarkWithGameId } = validBookmark;
        const result = createBookmarkSchema.safeParse({
          ...bookmarkWithGameId,
          gameId: '550e8400-e29b-41d4-a716-446655440002',
        });
        expect(result.success).toBe(true);
      });

      it('should accept bookmark with directStreamId', () => {
        const result = createBookmarkSchema.safeParse(validBookmark);
        expect(result.success).toBe(true);
      });

      it('should accept bookmark with both gameId and directStreamId', () => {
        const result = createBookmarkSchema.safeParse({
          ...validBookmark,
          gameId: '550e8400-e29b-41d4-a716-446655440002',
        });
        expect(result.success).toBe(true);
      });

      it('should reject bookmark without gameId or directStreamId', () => {
        const { directStreamId, ...bookmarkWithoutIds } = validBookmark;
        const result = createBookmarkSchema.safeParse(bookmarkWithoutIds);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Either gameId or directStreamId must be provided');
        }
      });
    });
  });

  describe('updateBookmarkSchema', () => {
    it('should accept valid update with all fields', () => {
      const result = updateBookmarkSchema.safeParse({
        label: 'Updated label',
        notes: 'Updated notes',
        isShared: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept update with only label', () => {
      const result = updateBookmarkSchema.safeParse({
        label: 'Updated label',
      });
      expect(result.success).toBe(true);
    });

    it('should accept update with only notes', () => {
      const result = updateBookmarkSchema.safeParse({
        notes: 'Updated notes',
      });
      expect(result.success).toBe(true);
    });

    it('should accept update with only isShared', () => {
      const result = updateBookmarkSchema.safeParse({
        isShared: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject label over max length', () => {
      const result = updateBookmarkSchema.safeParse({
        label: 'a'.repeat(BOOKMARK_LIMITS.LABEL_MAX + 1),
      });
      expect(result.success).toBe(false);
    });

    it('should reject notes over max length', () => {
      const result = updateBookmarkSchema.safeParse({
        notes: 'a'.repeat(BOOKMARK_LIMITS.NOTES_MAX + 1),
      });
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from label', () => {
      const result = updateBookmarkSchema.safeParse({
        label: '  Updated  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.label).toBe('Updated');
      }
    });

    it('should trim whitespace from notes', () => {
      const result = updateBookmarkSchema.safeParse({
        notes: '  Updated notes  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('Updated notes');
      }
    });
  });

  describe('BOOKMARK_LIMITS constants', () => {
    it('should have expected limit values', () => {
      expect(BOOKMARK_LIMITS.LABEL_MIN).toBe(1);
      expect(BOOKMARK_LIMITS.LABEL_MAX).toBe(100);
      expect(BOOKMARK_LIMITS.NOTES_MAX).toBe(500);
      expect(BOOKMARK_LIMITS.MAX_BOOKMARKS_PER_USER).toBe(1000);
      expect(BOOKMARK_LIMITS.MAX_TIMESTAMP_SECONDS).toBe(86400);
    });
  });
});

