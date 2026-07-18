/**
 * DVR Bookmarks Routes
 * 
 * API endpoints for bookmark management + SSE real-time stream.
 */

import { Router, Request, Response, NextFunction } from 'express';
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
import { prisma } from '../lib/prisma';
import { getBookmarkPubSub } from '../lib/bookmark-pubsub';
import { logger } from '../lib/logger';
import { BadRequestError, NotFoundError } from '../lib/errors';

const router = Router();

// Lazy initialization
let serviceInstance: DVRService | null = null;

function getDVRService(): DVRService {
  if (!serviceInstance) {
    const clipRepo = new ClipRepository(prisma);
    const bookmarkRepo = new BookmarkRepository(prisma);
    const mockProvider = new MockDVRService();
    serviceInstance = new DVRService(mockProvider, clipRepo, bookmarkRepo);
  }
  return serviceInstance;
}

// Export for testing (allows test to inject mock service)
export function setBookmarksDVRService(service: DVRService): void {
  serviceInstance = service;
}

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
      const repo = new BookmarkRepository(prisma);
      const bookmarks = await repo.listByStream(slug, undefined, true);
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
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createBookmarkSchema.parse(req.body);

    const bookmark = await getDVRService().createBookmark({
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
      next(new BadRequestError('Validation failed', err.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/bookmarks
 * List bookmarks with filters
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listBookmarksSchema.parse(req.query);

    const bookmarks = await getDVRService().listBookmarks({
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
      next(new BadRequestError('Validation failed', err.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/bookmarks/:bookmarkId
 * Get bookmark by ID
 */
router.get('/:bookmarkId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookmarkId } = bookmarkIdSchema.parse(req.params);

    const bookmark = await getDVRService().getBookmark(bookmarkId);

    if (!bookmark) {
      throw new NotFoundError('Bookmark not found');
    }

    res.status(200).json({ bookmark });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') {
      next(new BadRequestError('Validation failed', err.errors));
    } else {
      next(error);
    }
  }
});

/**
 * PATCH /api/bookmarks/:bookmarkId
 * Update bookmark
 */
router.patch('/:bookmarkId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookmarkId } = bookmarkIdSchema.parse(req.params);
    const updates = updateBookmarkSchema.parse(req.body);

    const bookmark = await getDVRService().updateBookmark(bookmarkId, updates);

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
      next(new BadRequestError('Validation failed', err.errors));
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/bookmarks/:bookmarkId
 * Delete bookmark
 */
router.delete('/:bookmarkId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookmarkId } = bookmarkIdSchema.parse(req.params);

    // Fetch before delete to get metadata for SSE notification
    const existing = await getDVRService().getBookmark(bookmarkId);

    await getDVRService().deleteBookmark(bookmarkId);

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
      next(new BadRequestError('Validation failed', err.errors));
    } else {
      next(error);
    }
  }
});

export default router;
