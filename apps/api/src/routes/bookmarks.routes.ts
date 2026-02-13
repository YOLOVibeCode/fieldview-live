/**
 * DVR Bookmarks Routes
 * 
 * API endpoints for bookmark management + SSE real-time stream.
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
} from '@fieldview/data-model';
import { getBookmarkPubSub } from '../lib/bookmark-pubsub';
import { logger } from '../lib/logger';

const router = Router();
const prisma = new PrismaClient();

// Initialize DVR service
const clipRepo = new ClipRepository(prisma);
const bookmarkRepo = new BookmarkRepository(prisma);
const mockProvider = new MockDVRService();
const dvrService = new DVRService(mockProvider, clipRepo, bookmarkRepo);

/**
 * GET /api/bookmarks/stream/:slug
 * SSE endpoint for real-time shared bookmark updates.
 */
router.get('/stream/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  logger.info({ slug }, 'Bookmark SSE connection established');

  // Send initial snapshot of shared bookmarks
  (async () => {
    try {
      // Check if stream exists and is not deleted
      const stream = await prisma.directStream.findFirst({
        where: { slug },
        select: { id: true, status: true },
      });

      if (!stream || stream.status === 'deleted') {
        res.write(`event: stream_ended\n`);
        res.write(`data: ${JSON.stringify({ reason: 'stream_deleted' })}\n\n`);
        res.end();
        return;
      }

      // Fetch all shared bookmarks for this stream
      const bookmarks = await bookmarkRepo.listByStream(slug, undefined, true);
      res.write(`event: bookmark_snapshot\n`);
      res.write(`data: ${JSON.stringify({ bookmarks })}\n\n`);
    } catch (error) {
      logger.error({ error, slug }, 'Failed to send bookmark snapshot');
    }
  })();

  // Subscribe to live bookmark events
  const pubsub = getBookmarkPubSub();
  const unsubscribe = pubsub.subscribe(slug, (data) => {
    res.write(`event: ${data.type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  // Keep-alive ping every 30s
  const pingInterval = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    unsubscribe();
    logger.info({ slug }, 'Bookmark SSE connection closed');
  });
});

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

    // Publish to SSE subscribers if bookmark is shared
    if (bookmark.isShared && bookmark.directStreamId) {
      getBookmarkPubSub().publish(bookmark.directStreamId, {
        type: 'bookmark_created',
        bookmark,
      });
    }

    res.status(201).json({ bookmark });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else {
      logger.error({ error }, 'Failed to create bookmark');
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
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else {
      logger.error({ error }, 'Failed to list bookmarks');
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
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else {
      logger.error({ error }, 'Failed to get bookmark');
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

    // Publish if bookmark is shared (or was just made shared)
    if (bookmark.isShared && bookmark.directStreamId) {
      getBookmarkPubSub().publish(bookmark.directStreamId, {
        type: 'bookmark_updated',
        bookmark,
      });
    }

    res.status(200).json({ bookmark });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else {
      logger.error({ error }, 'Failed to update bookmark');
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

    // Fetch before delete to get metadata for SSE notification
    const existing = await dvrService.getBookmark(bookmarkId);

    await dvrService.deleteBookmark(bookmarkId);

    // Publish deletion to SSE subscribers if it was shared
    if (existing?.isShared && existing?.directStreamId) {
      getBookmarkPubSub().publish(existing.directStreamId, {
        type: 'bookmark_deleted',
        bookmark: existing,
      });
    }

    res.status(204).send();
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else {
      logger.error({ error }, 'Failed to delete bookmark');
      res.status(500).json({ error: 'Failed to delete bookmark' });
    }
  }
});

export default router;
