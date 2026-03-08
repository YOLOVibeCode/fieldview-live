/**
 * DVR Clips Routes
 * 
 * API endpoints for clip management
 */

import { Router, Request, Response, NextFunction } from 'express';
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
} from '@fieldview/data-model';
import { BadRequestError, NotFoundError } from '../lib/errors';

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
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
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
      next(new BadRequestError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/clips/from-bookmark
 * Create a clip from a bookmark
 */
router.post('/from-bookmark', async (req: Request, res: Response, next: NextFunction) => {
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
      next(new BadRequestError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/clips
 * List clips with filters
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
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
      next(new BadRequestError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/clips/:clipId
 * Get clip by ID
 */
router.get('/:clipId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clipId } = clipIdSchema.parse(req.params);

    const clip = await dvrService.getClip(clipId);

    if (!clip) {
      throw new NotFoundError('Clip not found');
    }

    res.status(200).json({ clip });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      next(new BadRequestError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/clips/:clipId
 * Delete clip
 */
router.delete('/:clipId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clipId } = clipIdSchema.parse(req.params);

    await dvrService.deleteClip(clipId);

    res.status(204).send();
  } catch (error: any) {
    if (error.name === 'ZodError') {
      next(new BadRequestError('Validation failed', error.errors));
    } else if (error.message?.includes('not found')) {
      next(new NotFoundError('Clip not found'));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/clips/:clipId/view
 * Track clip view
 */
router.post('/:clipId/view', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clipId } = clipIdSchema.parse(req.params);

    await dvrService.trackClipView(clipId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      next(new BadRequestError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/clips/:clipId/share
 * Track clip share
 */
router.post('/:clipId/share', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clipId } = clipIdSchema.parse(req.params);

    await dvrService.trackClipShare(clipId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      next(new BadRequestError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

export default router;

