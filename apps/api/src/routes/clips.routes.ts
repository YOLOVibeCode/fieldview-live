/**
 * DVR Clips Routes
 * 
 * API endpoints for clip management
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DVRService } from '../services/DVRService';
import { ClipRepository } from '../repositories/ClipRepository';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { MockDVRService } from '@fieldview/dvr-service';
import {
  createClipSchema,
  createClipFromBookmarkSchema,
  listClipsSchema,
  clipIdSchema,
} from '../../../packages/data-model/src/schemas/dvrSchemas';

const router = Router();
const prisma = new PrismaClient();

// Initialize DVR service
const clipRepo = new ClipRepository(prisma);
const bookmarkRepo = new BookmarkRepository(prisma);
const mockProvider = new MockDVRService();
const dvrService = new DVRService(mockProvider, clipRepo, bookmarkRepo);

/**
 * POST /api/clips
 * Create a new clip from recording
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = createClipSchema.parse(req.body);

    const clip = await dvrService.createClipFromRecording({
      gameId: input.gameId,
      directStreamId: input.directStreamId,
      directStreamSlug: input.directStreamSlug,
      providerName: input.providerName,
      recordingId: input.recordingId,
      title: input.title,
      description: input.description,
      startTimeSeconds: input.startTimeSeconds,
      endTimeSeconds: input.endTimeSeconds,
      isPublic: input.isPublic,
      // TODO: Get from auth middleware
      createdById: undefined,
      createdByType: 'system',
    });

    res.status(201).json({ clip });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to create clip:', error);
      res.status(500).json({ error: 'Failed to create clip' });
    }
  }
});

/**
 * POST /api/clips/from-bookmark
 * Create a clip from a bookmark
 */
router.post('/from-bookmark', async (req: Request, res: Response) => {
  try {
    const input = createClipFromBookmarkSchema.parse(req.body);

    const clip = await dvrService.createClipFromBookmark({
      bookmarkId: input.bookmarkId,
      title: input.title,
      description: input.description,
      bufferSeconds: input.bufferSeconds,
      isPublic: input.isPublic,
    });

    res.status(201).json({ clip });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to create clip from bookmark:', error);
      res.status(500).json({ error: 'Failed to create clip from bookmark' });
    }
  }
});

/**
 * GET /api/clips
 * List clips with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listClipsSchema.parse(req.query);

    const clips = await dvrService.listClips({
      gameId: query.gameId,
      directStreamId: query.directStreamId,
      directStreamSlug: query.directStreamSlug,
      publicOnly: query.publicOnly,
      limit: query.limit,
      offset: query.offset,
      orderBy: query.orderBy,
      orderDirection: query.orderDirection,
    });

    res.status(200).json({ clips });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to list clips:', error);
      res.status(500).json({ error: 'Failed to list clips' });
    }
  }
});

/**
 * GET /api/clips/:clipId
 * Get clip by ID
 */
router.get('/:clipId', async (req: Request, res: Response) => {
  try {
    const { clipId } = clipIdSchema.parse(req.params);

    const clip = await dvrService.getClip(clipId);

    if (!clip) {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }

    res.status(200).json({ clip });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to get clip:', error);
      res.status(500).json({ error: 'Failed to get clip' });
    }
  }
});

/**
 * DELETE /api/clips/:clipId
 * Delete clip
 */
router.delete('/:clipId', async (req: Request, res: Response) => {
  try {
    const { clipId } = clipIdSchema.parse(req.params);

    await dvrService.deleteClip(clipId);

    res.status(204).send();
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else if (error.message?.includes('not found')) {
      res.status(404).json({ error: 'Clip not found' });
    } else {
      console.error('Failed to delete clip:', error);
      res.status(500).json({ error: 'Failed to delete clip' });
    }
  }
});

/**
 * POST /api/clips/:clipId/view
 * Track clip view
 */
router.post('/:clipId/view', async (req: Request, res: Response) => {
  try {
    const { clipId } = clipIdSchema.parse(req.params);

    await dvrService.trackClipView(clipId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to track view:', error);
      res.status(500).json({ error: 'Failed to track view' });
    }
  }
});

/**
 * POST /api/clips/:clipId/share
 * Track clip share
 */
router.post('/:clipId/share', async (req: Request, res: Response) => {
  try {
    const { clipId } = clipIdSchema.parse(req.params);

    await dvrService.trackClipShare(clipId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to track share:', error);
      res.status(500).json({ error: 'Failed to track share' });
    }
  }
});

export default router;

