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
 * GET /api/bookmarks/stream/:streamId
 * SSE endpoint for real-time shared bookmark updates.
 * :streamId may be a UUID (directStreamId) or a slug — we normalise internally.
 */
router.get('/stream/:streamId', (req: Request, res: Response) => {
  const { streamId } = req.params;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Detect whether streamId is a UUID or a slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(streamId);
  const whereClause = isUuid ? { id: streamId } : { slug: streamId };

  logger.info({ streamId }, 'Bookmark SSE connection established');

  // Send initial snapshot of shared bookmarks
  (async () => {
    try {
      const stream = await prisma.directStream.findFirst({
        where: whereClause,
        select: { id: true, status: true },
      });

      if (!stream || stream.status === 'deleted') {
        res.write(`event: stream_ended\n`);
        res.write(`data: ${JSON.stringify({ reason: 'stream_deleted' })}\n\n`);
        res.end();
        return;
      }

      // Snapshot uses UUID so listByStream always queries correctly
      const repo = new BookmarkRepository(prisma);
      const bookmarks = await repo.listByStream(stream.id, undefined, true);
      res.write(`event: bookmark_snapshot\n`);
      res.write(`data: ${JSON.stringify({ bookmarks })}\n\n`);
    } catch (error) {
      logger.error({ error, streamId }, 'Failed to send bookmark snapshot');
    }
  })();

  // Subscribe using the normalised streamId key (client always sends UUID after A1)
  const pubsub = getBookmarkPubSub();
  const unsubscribe = pubsub.subscribe(streamId, (data) => {
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
    logger.info({ streamId }, 'Bookmark SSE connection closed');
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
      bufferSeconds: input.bufferSeconds,
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
      includeShared: query.includeShared,
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
 * Update bookmark — caller must own it (viewerIdentityId in body) or be stream admin.
 */
router.patch('/:bookmarkId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookmarkId } = bookmarkIdSchema.parse(req.params);
    const updates = updateBookmarkSchema.parse(req.body);

    // Ownership check: optional viewerIdentityId in body; if provided must match
    const callerId: string | undefined = (req.body as { viewerIdentityId?: string }).viewerIdentityId;
    if (callerId) {
      const existing = await getDVRService().getBookmark(bookmarkId);
      if (!existing) {
        throw new NotFoundError('Bookmark not found');
      }
      if (existing.viewerIdentityId && existing.viewerIdentityId !== callerId) {
        res.status(403).json({ error: 'Forbidden: not the bookmark owner' });
        return;
      }
    }

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
 * Delete bookmark — caller must own it (viewerIdentityId query param) or be stream admin.
 */
router.delete('/:bookmarkId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookmarkId } = bookmarkIdSchema.parse(req.params);

    // Fetch before delete to get metadata for SSE notification + ownership check
    const existing = await getDVRService().getBookmark(bookmarkId);

    if (!existing) {
      throw new NotFoundError('Bookmark not found');
    }

    // Ownership check: optional viewerIdentityId query param
    const callerId = (req.query as { viewerIdentityId?: string }).viewerIdentityId;
    if (callerId && existing.viewerIdentityId && existing.viewerIdentityId !== callerId) {
      res.status(403).json({ error: 'Forbidden: not the bookmark owner' });
      return;
    }

    await getDVRService().deleteBookmark(bookmarkId);

    // Publish deletion to SSE subscribers if it was shared
    if (existing.isShared && existing.directStreamId) {
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
