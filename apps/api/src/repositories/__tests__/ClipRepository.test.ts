/**
 * ClipRepository Tests (TDD)
 * 
 * Write tests first, then implement to satisfy them
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ClipRepository } from '../ClipRepository';
import type { CreateClipInput, UpdateClipInput } from '../interfaces/IClipRepository';

const prisma = new PrismaClient();
const clipRepo = new ClipRepository(prisma);

describe('ClipRepository (TDD)', () => {
  // Cleanup after each test
  afterEach(async () => {
    await prisma.videoClip.deleteMany();
  });

  describe('IClipWriter', () => {
    it('should create a clip', async () => {
      const input: CreateClipInput = {
        providerName: 'mock',
        providerClipId: 'mock-clip-123',
        title: 'Test Clip',
        startTimeSeconds: 10,
        endTimeSeconds: 40,
        durationSeconds: 30,
        status: 'ready',
      };

      const clip = await clipRepo.create(input);

      expect(clip.id).toBeDefined();
      expect(clip.providerName).toBe('mock');
      expect(clip.providerClipId).toBe('mock-clip-123');
      expect(clip.title).toBe('Test Clip');
      expect(clip.durationSeconds).toBe(30);
      expect(clip.status).toBe('ready');
      expect(clip.isPublic).toBe(false); // Default
      expect(clip.viewCount).toBe(0); // Default
    });

    it('should update a clip', async () => {
      const clip = await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-clip-update',
        title: 'Original Title',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'pending',
      });

      const update: UpdateClipInput = {
        title: 'Updated Title',
        status: 'ready',
        playbackUrl: 'https://example.com/clip.m3u8',
      };

      const updated = await clipRepo.update(clip.id, update);

      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('ready');
      expect(updated.playbackUrl).toBe('https://example.com/clip.m3u8');
    });

    it('should delete a clip', async () => {
      const clip = await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-clip-delete',
        title: 'To Delete',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
      });

      await clipRepo.delete(clip.id);

      const deleted = await clipRepo.getById(clip.id);
      expect(deleted).toBeNull();
    });

    it('should increment view count', async () => {
      const clip = await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-clip-views',
        title: 'View Test',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
      });

      await clipRepo.incrementViewCount(clip.id);
      await clipRepo.incrementViewCount(clip.id);

      const updated = await clipRepo.getById(clip.id);
      expect(updated?.viewCount).toBe(2);
    });

    it('should increment share count', async () => {
      const clip = await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-clip-shares',
        title: 'Share Test',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
      });

      await clipRepo.incrementShareCount(clip.id);

      const updated = await clipRepo.getById(clip.id);
      expect(updated?.shareCount).toBe(1);
    });

    it('should delete expired clips', async () => {
      // Create expired clip
      await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-expired-1',
        title: 'Expired Clip',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      // Create non-expired clip
      await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-active-1',
        title: 'Active Clip',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
        expiresAt: new Date(Date.now() + 10000), // 10 seconds from now
      });

      const deletedCount = await clipRepo.deleteExpired();
      expect(deletedCount).toBe(1);

      const remaining = await clipRepo.listPublic();
      expect(remaining.length).toBe(0); // Only public clips
    });
  });

  describe('IClipReader', () => {
    it('should get clip by ID', async () => {
      const created = await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-clip-get',
        title: 'Get Test',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
      });

      const clip = await clipRepo.getById(created.id);

      expect(clip).not.toBeNull();
      expect(clip?.id).toBe(created.id);
      expect(clip?.title).toBe('Get Test');
    });

    it('should return null for non-existent clip', async () => {
      const clip = await clipRepo.getById('00000000-0000-0000-0000-000000000000');
      expect(clip).toBeNull();
    });

    it('should list public clips', async () => {
      await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-public-1',
        title: 'Public Clip 1',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
        isPublic: true,
      });

      await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'mock-private-1',
        title: 'Private Clip 1',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
        isPublic: false,
      });

      const publicClips = await clipRepo.listPublic();
      expect(publicClips.length).toBe(1);
      expect(publicClips[0].title).toBe('Public Clip 1');
    });

    it('should get clip by provider info', async () => {
      await clipRepo.create({
        providerName: 'mux',
        providerClipId: 'mux-asset-abc123',
        title: 'Mux Clip',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
      });

      const clip = await clipRepo.getByProvider('mux', 'mux-asset-abc123');
      expect(clip).not.toBeNull();
      expect(clip?.title).toBe('Mux Clip');
    });

    it('should list clips with pagination and ordering', async () => {
      // Create multiple clips with delay to ensure different timestamps
      for (let i = 1; i <= 5; i++) {
        await clipRepo.create({
          providerName: 'mock',
          providerClipId: `mock-clip-${i}`,
          title: `Clip ${i}`,
          startTimeSeconds: 0,
          endTimeSeconds: 30,
          durationSeconds: 30,
          status: 'ready',
          isPublic: true,
        });
        // Small delay to ensure createdAt ordering
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Test pagination
      const page1 = await clipRepo.listPublic({ limit: 2, offset: 0 });
      expect(page1.length).toBe(2);

      const page2 = await clipRepo.listPublic({ limit: 2, offset: 2 });
      expect(page2.length).toBe(2);

      // Test ordering (newest first by default)
      const newest = await clipRepo.listPublic({ orderBy: 'createdAt', orderDirection: 'desc' });
      expect(newest.length).toBeGreaterThanOrEqual(5);
      // Last created should be first in desc order
      const titles = newest.map(c => c.title);
      const clip5Index = titles.indexOf('Clip 5');
      const clip1Index = titles.indexOf('Clip 1');
      expect(clip5Index).toBeLessThan(clip1Index);
    });
  });

  describe('ISP Compliance', () => {
    it('should allow using only IClipReader', async () => {
      // Type test: Client can depend on only reader
      const reader: typeof clipRepo = clipRepo;
      
      const created = await clipRepo.create({
        providerName: 'mock',
        providerClipId: 'isp-test',
        title: 'ISP Test',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        durationSeconds: 30,
        status: 'ready',
      });

      const clip = await reader.getById(created.id);
      expect(clip).not.toBeNull();
      expect(clip?.title).toBe('ISP Test');
    });
  });
});

