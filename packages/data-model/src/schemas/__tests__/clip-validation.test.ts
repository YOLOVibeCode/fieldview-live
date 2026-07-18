/**
 * Clip Validation Tests
 * 
 * Tests for clip field length limits and validation
 */

import { describe, it, expect } from 'vitest';
import {
  createClipFromBookmarkSchema,
  CLIP_LIMITS,
} from '../dvrSchemas';

describe('Clip Validation', () => {
  describe('createClipFromBookmarkSchema', () => {
    const validClip = {
      bookmarkId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Amazing Goal',
      description: 'Forward #7 scored',
      bufferSeconds: 5,
      isPublic: true,
    };

    it('should accept valid clip request', () => {
      const result = createClipFromBookmarkSchema.safeParse(validClip);
      expect(result.success).toBe(true);
    });

    describe('bufferSeconds field', () => {
      it('should accept buffer at 0 seconds', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          bufferSeconds: 0,
        });
        expect(result.success).toBe(true);
      });

      it('should accept buffer at 5 seconds (default)', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          bufferSeconds: 5,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.bufferSeconds).toBe(5);
        }
      });

      it('should accept buffer at max (30 seconds)', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          bufferSeconds: CLIP_LIMITS.BUFFER_SECONDS_MAX,
        });
        expect(result.success).toBe(true);
      });

      it('should reject buffer over max (31 seconds)', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          bufferSeconds: CLIP_LIMITS.BUFFER_SECONDS_MAX + 1,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('30 seconds or less');
        }
      });

      it('should reject negative buffer', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          bufferSeconds: -1,
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-integer buffer', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          bufferSeconds: 5.5,
        });
        expect(result.success).toBe(false);
      });

      it('should default to 5 seconds when undefined', () => {
        const { bufferSeconds, ...clipWithoutBuffer } = validClip;
        const result = createClipFromBookmarkSchema.safeParse(clipWithoutBuffer);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.bufferSeconds).toBe(5);
        }
      });
    });

    describe('title field', () => {
      it('should accept title at max length', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          title: 'a'.repeat(CLIP_LIMITS.TITLE_MAX),
        });
        expect(result.success).toBe(true);
      });

      it('should reject title over max length', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          title: 'a'.repeat(CLIP_LIMITS.TITLE_MAX + 1),
        });
        expect(result.success).toBe(false);
      });

      it('should accept undefined title', () => {
        const { title, ...clipWithoutTitle } = validClip;
        const result = createClipFromBookmarkSchema.safeParse(clipWithoutTitle);
        expect(result.success).toBe(true);
      });
    });

    describe('description field', () => {
      it('should accept description at max length', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          description: 'a'.repeat(CLIP_LIMITS.DESCRIPTION_MAX),
        });
        expect(result.success).toBe(true);
      });

      it('should reject description over max length', () => {
        const result = createClipFromBookmarkSchema.safeParse({
          ...validClip,
          description: 'a'.repeat(CLIP_LIMITS.DESCRIPTION_MAX + 1),
        });
        expect(result.success).toBe(false);
      });

      it('should accept undefined description', () => {
        const { description, ...clipWithoutDesc } = validClip;
        const result = createClipFromBookmarkSchema.safeParse(clipWithoutDesc);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('CLIP_LIMITS constants', () => {
    it('should have expected limit values', () => {
      expect(CLIP_LIMITS.TITLE_MAX).toBe(200);
      expect(CLIP_LIMITS.DESCRIPTION_MAX).toBe(1000);
      expect(CLIP_LIMITS.BUFFER_SECONDS_MIN).toBe(0);
      expect(CLIP_LIMITS.BUFFER_SECONDS_MAX).toBe(30);
      expect(CLIP_LIMITS.MAX_CLIP_DURATION).toBe(60);
    });
  });

  describe('clip duration validation', () => {
    it('should calculate correct clip duration from buffer', () => {
      // Buffer of 30 seconds = 30 sec before + 30 sec after = 60 sec total
      const bufferSeconds = 30;
      const expectedDuration = bufferSeconds * 2;
      
      expect(expectedDuration).toBe(CLIP_LIMITS.MAX_CLIP_DURATION);
    });

    it('should result in shareable clips (under 1 minute)', () => {
      // Max buffer of 30 seconds creates max clip of 60 seconds
      // This is perfect for social media sharing (Twitter, Instagram, etc.)
      expect(CLIP_LIMITS.MAX_CLIP_DURATION).toBeLessThanOrEqual(60);
    });
  });
});

