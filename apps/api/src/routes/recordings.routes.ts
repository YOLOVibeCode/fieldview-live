/**
 * DVR Recordings Routes
 * 
 * API endpoints for recording management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DVRService } from '../services/DVRService';
import { ClipRepository } from '../repositories/ClipRepository';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { MockDVRService } from '@fieldview/dvr-service';
import {
  startRecordingSchema,
  recordingIdSchema,
} from '@fieldview/data-model';
import { prisma } from '../lib/prisma';
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
export function setRecordingsDVRService(service: DVRService): void {
  serviceInstance = service;
}

/**
 * POST /api/recordings/start
 * Start a new recording
 */
router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = startRecordingSchema.parse(req.body);

    const result = await getDVRService().startRecording(input.streamKey, input.metadata);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      next(new BadRequestError('Validation failed', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/recordings/:recordingId/stop
 * Stop a recording
 */
router.post('/:recordingId/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recordingId } = recordingIdSchema.parse(req.params);

    await getDVRService().stopRecording(recordingId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      next(new BadRequestError('Validation failed', error.errors));
    } else if (error.message?.includes('not found')) {
      next(new NotFoundError('Recording not found'));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/recordings/:recordingId/status
 * Get recording status
 */
router.get('/:recordingId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recordingId } = recordingIdSchema.parse(req.params);

    const status = await getDVRService().getRecordingStatus(recordingId);

    res.status(200).json(status);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      next(new BadRequestError('Validation failed', error.errors));
    } else if (error.message?.includes('not found')) {
      next(new NotFoundError('Recording not found'));
    } else {
      next(error);
    }
  }
});

export default router;

