/**
 * DVR Recordings Routes
 * 
 * API endpoints for recording management
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DVRService } from '../services/DVRService';
import { ClipRepository } from '../repositories/ClipRepository';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { MockDVRService } from '@fieldview/dvr-service';
import {
  startRecordingSchema,
  recordingIdSchema,
} from '@fieldview/data-model';

const router = Router();
const prisma = new PrismaClient();

// Initialize DVR service
const clipRepo = new ClipRepository(prisma);
const bookmarkRepo = new BookmarkRepository(prisma);
const mockProvider = new MockDVRService();
const dvrService = new DVRService(mockProvider, clipRepo, bookmarkRepo);

/**
 * POST /api/recordings/start
 * Start a new recording
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const input = startRecordingSchema.parse(req.body);

    const result = await dvrService.startRecording(input.streamKey, input.metadata);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      console.error('Failed to start recording:', error);
      res.status(500).json({ error: 'Failed to start recording' });
    }
  }
});

/**
 * POST /api/recordings/:recordingId/stop
 * Stop a recording
 */
router.post('/:recordingId/stop', async (req: Request, res: Response) => {
  try {
    const { recordingId } = recordingIdSchema.parse(req.params);

    await dvrService.stopRecording(recordingId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else if (error.message?.includes('not found')) {
      res.status(404).json({ error: 'Recording not found' });
    } else {
      console.error('Failed to stop recording:', error);
      res.status(500).json({ error: 'Failed to stop recording' });
    }
  }
});

/**
 * GET /api/recordings/:recordingId/status
 * Get recording status
 */
router.get('/:recordingId/status', async (req: Request, res: Response) => {
  try {
    const { recordingId } = recordingIdSchema.parse(req.params);

    const status = await dvrService.getRecordingStatus(recordingId);

    res.status(200).json(status);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else if (error.message?.includes('not found')) {
      res.status(404).json({ error: 'Recording not found' });
    } else {
      console.error('Failed to get recording status:', error);
      res.status(500).json({ error: 'Failed to get recording status' });
    }
  }
});

export default router;

