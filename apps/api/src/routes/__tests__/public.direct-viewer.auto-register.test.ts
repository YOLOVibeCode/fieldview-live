/**
 * Auto-Registration API Route Tests (TDD)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createDirectViewerRouter } from '../public.direct-viewer';
import { createAutoRegistrationService } from '../../services/auto-registration.implementations';
import type { ViewerIdentity, DirectStreamRegistration } from '@prisma/client';

// Mock the auto-registration service
vi.mock('../../services/auto-registration.implementations');

describe('POST /api/public/direct/viewer/auto-register (TDD)', () => {
  let app: Express;

  const mockViewer: ViewerIdentity = {
    id: 'viewer-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date('2026-01-01'),
    phoneE164: null,
    smsOptOut: false,
    optOutAt: null,
    lastSeenAt: null,
    wantsReminders: true,
    emailVerifiedAt: null,
  };

  const mockRegistration: DirectStreamRegistration = {
    id: 'reg-789',
    directStreamId: 'stream-456',
    viewerIdentityId: 'viewer-123',
    registeredAt: new Date('2026-01-15'),
    directStreamEventId: null,
    verifiedAt: null,
    wantsReminders: false,
    lastSeenAt: null,
  };

  beforeEach(() => {
    // Create Express app with route
    app = express();
    app.use(express.json());
    app.use('/api/public', createDirectViewerRouter());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if directStreamSlug is missing', async () => {
    const response = await request(app)
      .post('/api/public/direct/viewer/auto-register')
      .send({ viewerIdentityId: 'viewer-123' });

    expect(response.status).toBe(400);
  });

  it('should return 400 if viewerIdentityId is missing', async () => {
    const response = await request(app)
      .post('/api/public/direct/viewer/auto-register')
      .send({ directStreamSlug: 'tchs' });

    expect(response.status).toBe(400);
  });

  it('should return 404 if stream not found', async () => {
    vi.mocked(createAutoRegistrationService).mockReturnValue({
      autoRegister: vi.fn().mockRejectedValue(new Error('Stream not found: nonexistent')),
    } as any);

    const response = await request(app)
      .post('/api/public/direct/viewer/auto-register')
      .send({
        directStreamSlug: 'nonexistent',
        viewerIdentityId: 'viewer-123',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Stream not found');
  });

  it('should return 404 if viewer not found', async () => {
    vi.mocked(createAutoRegistrationService).mockReturnValue({
      autoRegister: vi.fn().mockRejectedValue(new Error('Viewer identity not found: nonexistent')),
    } as any);

    const response = await request(app)
      .post('/api/public/direct/viewer/auto-register')
      .send({
        directStreamSlug: 'tchs',
        viewerIdentityId: 'nonexistent',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Viewer identity not found');
  });

  it('should return existing registration if already registered', async () => {
    vi.mocked(createAutoRegistrationService).mockReturnValue({
      autoRegister: vi.fn().mockResolvedValue({
        registration: {
          ...mockRegistration,
          viewerIdentity: mockViewer,
        },
        isNewRegistration: false,
      }),
    } as any);

    const response = await request(app)
      .post('/api/public/direct/viewer/auto-register')
      .send({
        directStreamSlug: 'tchs',
        viewerIdentityId: 'viewer-123',
      });

    expect(response.status).toBe(200);
    expect(response.body.isNewRegistration).toBe(false);
    expect(response.body.registration.id).toBe('reg-789');
    expect(response.body.registration.viewerIdentity.email).toBe('test@example.com');
  });

  it('should return new registration if not already registered', async () => {
    vi.mocked(createAutoRegistrationService).mockReturnValue({
      autoRegister: vi.fn().mockResolvedValue({
        registration: {
          ...mockRegistration,
          viewerIdentity: mockViewer,
        },
        isNewRegistration: true,
      }),
    } as any);

    const response = await request(app)
      .post('/api/public/direct/viewer/auto-register')
      .send({
        directStreamSlug: 'tchs',
        viewerIdentityId: 'viewer-123',
      });

    expect(response.status).toBe(201);
    expect(response.body.isNewRegistration).toBe(true);
    expect(response.body.registration.id).toBe('reg-789');
    expect(response.body.registration.accessToken).toBeNull(); // No longer storing access tokens
  });

  it('should format dates as ISO strings', async () => {
    vi.mocked(createAutoRegistrationService).mockReturnValue({
      autoRegister: vi.fn().mockResolvedValue({
        registration: {
          ...mockRegistration,
          viewerIdentity: mockViewer,
        },
        isNewRegistration: true,
      }),
    } as any);

    const response = await request(app)
      .post('/api/public/direct/viewer/auto-register')
      .send({
        directStreamSlug: 'tchs',
        viewerIdentityId: 'viewer-123',
      });

    expect(response.body.registration.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should handle internal server errors', async () => {
    vi.mocked(createAutoRegistrationService).mockReturnValue({
      autoRegister: vi.fn().mockRejectedValue(new Error('Database connection failed')),
    } as any);

    const response = await request(app)
      .post('/api/public/direct/viewer/auto-register')
      .send({
        directStreamSlug: 'tchs',
        viewerIdentityId: 'viewer-123',
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Auto-registration failed');
  });
});

