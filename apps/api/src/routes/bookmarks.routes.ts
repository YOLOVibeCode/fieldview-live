/**
 * DVR Bookmarks Routes
 * 
 * API endpoints for bookmark management
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DVRService } from '../services/DVRService';
import { ClipRepository } from '../repositories/ClipRepository';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { MockDVRService } from '@fieldview/dvr-service';
import {
  createBookmarkSchema,
  updateBookmarkSchema,
  listBookmarksSchema,
  bookmarkIdSchema,
} from '@fieldview/data-model/src/schemas/dvrSchemas';

const router = Router();
const prisma = new PrismaClient();

// Initialize DVR service
const clipRepo = new ClipRepository(prisma);
const bookmarkRepo = new BookmarkRepository(prisma);
const mockProvider = new MockDVRService();
const dvrService = new DVRService(mockProvider, clipRepo, bookmarkRepo);

/**
 * POST /api/bookmarks
 * Create a new bookmark
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = createBookmarkSchema.parse(req.body);

    const bookmark = await dvrService.createBookmark({
      gameId: input.gameId,
      directStreamId: input.directStreamId,
      viewerIdentityId: input.viewerIdentityId,
      timestampSeconds: input.timestampSeconds,
      label: input.label,
      notes: input.notes,
      isShared: input.isShared,
    });

    res.status(201).json({ bookmark });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to create bookmark:', error);
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  }
});

/**
 * GET /api/bookmarks
 * List bookmarks with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listBookmarksSchema.parse(req.query);

    const bookmarks = await dvrService.listBookmarks({
      viewerId: query.viewerId,
      gameId: query.gameId,
      directStreamId: query.directStreamId,
      publicOnly: query.publicOnly,
      limit: query.limit,
      offset: query.offset,
    });

    res.status(200).json({ bookmarks });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to list bookmarks:', error);
      res.status(500).json({ error: 'Failed to list bookmarks' });
    }
  }
});

/**
 * GET /api/bookmarks/:bookmarkId
 * Get bookmark by ID
 */
router.get('/:bookmarkId', async (req: Request, res: Response) => {
  try {
    const { bookmarkId } = bookmarkIdSchema.parse(req.params);

    const bookmark = await dvrService.getBookmark(bookmarkId);

    if (!bookmark) {
      res.status(404).json({ error: 'Bookmark not found' });
      return;
    }

    res.status(200).json({ bookmark });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to get bookmark:', error);
      res.status(500).json({ error: 'Failed to get bookmark' });
    }
  }
});

/**
 * PATCH /api/bookmarks/:bookmarkId
 * Update bookmark
 */
router.patch('/:bookmarkId', async (req: Request, res: Response) => {
  try {
    const { bookmarkId } = bookmarkIdSchema.parse(req.params);
    const updates = updateBookmarkSchema.parse(req.body);

    const bookmark = await dvrService.updateBookmark(bookmarkId, updates);

    res.status(200).json({ bookmark });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to update bookmark:', error);
      res.status(500).json({ error: 'Failed to update bookmark' });
    }
  }
});

/**
 * DELETE /api/bookmarks/:bookmarkId
 * Delete bookmark
 */
router.delete('/:bookmarkId', async (req: Request, res: Response) => {
  try {
    const { bookmarkId } = bookmarkIdSchema.parse(req.params);

    await dvrService.deleteBookmark(bookmarkId);

    res.status(204).send();
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to delete bookmark:', error);
      res.status(500).json({ error: 'Failed to delete bookmark' });
    }
  }
});

export default router;

