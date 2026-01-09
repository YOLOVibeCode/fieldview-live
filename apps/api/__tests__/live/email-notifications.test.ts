/**
 * Email Notification System Tests
 * TDD tests for email reminders and cron jobs
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/encryption';
import { sendStreamReminders } from '@/jobs/send-stream-reminders';
import * as emailLib from '@/lib/email';

describe('Email Notification System', () => {
  let testStreamId: string;
  let testViewerId1: string;
  let testViewerId2: string;
  let testOwnerAccountId: string;
  let testGameId: string;
  const SLUG = 'test-email-stream';

  beforeAll(async () => {
    // Create test owner account
    const owner = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner',
        status: 'active',
        contactEmail: 'owner@test.com',
      },
    });
    testOwnerAccountId = owner.id;

    // Create test game
    const game = await prisma.game.create({
      data: {
        ownerAccountId: testOwnerAccountId,
        title: `Direct Stream: ${SLUG}`,
        homeTeam: SLUG,
        awayTeam: 'TBD',
        startsAt: new Date(),
        priceCents: 0,
        currency: 'USD',
        keywordCode: `DIRECT-${SLUG.toUpperCase()}-${Date.now()}`,
        qrUrl: '',
        state: 'live',
      },
    });
    testGameId = game.id;

    // Create test viewers
    const viewer1 = await prisma.viewerIdentity.create({
      data: {
        email: 'viewer1@test.com',
        firstName: 'Viewer',
        lastName: 'One',
        wantsReminders: true,
      },
    });
    testViewerId1 = viewer1.id;

    const viewer2 = await prisma.viewerIdentity.create({
      data: {
        email: 'viewer2@test.com',
        firstName: 'Viewer',
        lastName: 'Two',
        wantsReminders: false, // Opted out
      },
    });
    testViewerId2 = viewer2.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.directStream.deleteMany({ where: { slug: SLUG } });
    await prisma.viewerIdentity.deleteMany({
      where: { id: { in: [testViewerId1, testViewerId2] } },
    });
    await prisma.game.delete({ where: { id: testGameId } });
    await prisma.ownerAccount.delete({ where: { id: testOwnerAccountId } });
  });

  beforeEach(async () => {
    // Reset stream
    await prisma.directStream.deleteMany({ where: { slug: SLUG } });
  });

  describe('Cron Job - sendStreamReminders', () => {
    it('should send reminders for streams starting in 5 minutes', async () => {
      // Mock sendEmail
      const sendEmailSpy = vi.spyOn(emailLib, 'sendEmail').mockResolvedValue(true);

      // Create stream scheduled exactly 5 minutes from now (within the 1-minute window)
      const now = new Date();
      const scheduledTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes away
      
      await prisma.directStream.create({
        data: {
          slug: SLUG,
          title: 'Test Stream - 5min',
          adminPassword: await hashPassword('admin123'),
          gameId: testGameId,
          scheduledStartAt: scheduledTime,
          sendReminders: true,
          reminderMinutes: 5,
          reminderSentAt: null,
        },
      });

      // Run cron job
      await sendStreamReminders();

      // Should have sent 1 email (only viewer1 wants reminders)
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'viewer1@test.com',
          subject: expect.stringContaining('Starting in 5 minutes'),
        })
      );

      // Verify reminderSentAt was updated
      const stream = await prisma.directStream.findUnique({
        where: { slug: SLUG },
      });
      expect(stream?.reminderSentAt).toBeTruthy();

      sendEmailSpy.mockRestore();
    });

    it('should not send reminders if already sent', async () => {
      const sendEmailSpy = vi.spyOn(emailLib, 'sendEmail').mockResolvedValue(true);

      const scheduledTime = new Date(Date.now() + 5 * 60 * 1000);
      
      await prisma.directStream.create({
        data: {
          slug: SLUG,
          title: 'Test Stream - Already Sent',
          adminPassword: await hashPassword('admin123'),
          gameId: testGameId,
          scheduledStartAt: scheduledTime,
          sendReminders: true,
          reminderMinutes: 5,
          reminderSentAt: new Date(), // Already sent
        },
      });

      await sendStreamReminders();

      // Should NOT send any emails
      expect(sendEmailSpy).not.toHaveBeenCalled();

      sendEmailSpy.mockRestore();
    });

    it('should not send reminders if sendReminders is false', async () => {
      const sendEmailSpy = vi.spyOn(emailLib, 'sendEmail').mockResolvedValue(true);

      const scheduledTime = new Date(Date.now() + 5 * 60 * 1000);
      
      await prisma.directStream.create({
        data: {
          slug: SLUG,
          title: 'Test Stream - Disabled',
          adminPassword: await hashPassword('admin123'),
          gameId: testGameId,
          scheduledStartAt: scheduledTime,
          sendReminders: false, // Disabled
          reminderMinutes: 5,
          reminderSentAt: null,
        },
      });

      await sendStreamReminders();

      expect(sendEmailSpy).not.toHaveBeenCalled();

      sendEmailSpy.mockRestore();
    });

    it('should not send reminders if no scheduled time', async () => {
      const sendEmailSpy = vi.spyOn(emailLib, 'sendEmail').mockResolvedValue(true);

      await prisma.directStream.create({
        data: {
          slug: SLUG,
          title: 'Test Stream - No Schedule',
          adminPassword: await hashPassword('admin123'),
          gameId: testGameId,
          scheduledStartAt: null, // No scheduled time
          sendReminders: true,
          reminderMinutes: 5,
          reminderSentAt: null,
        },
      });

      await sendStreamReminders();

      expect(sendEmailSpy).not.toHaveBeenCalled();

      sendEmailSpy.mockRestore();
    });

    it('should not send reminders too early (>15 minutes away)', async () => {
      const sendEmailSpy = vi.spyOn(emailLib, 'sendEmail').mockResolvedValue(true);

      // Stream scheduled 20 minutes from now
      const scheduledTime = new Date(Date.now() + 20 * 60 * 1000);
      
      await prisma.directStream.create({
        data: {
          slug: SLUG,
          title: 'Test Stream - Too Early',
          adminPassword: await hashPassword('admin123'),
          gameId: testGameId,
          scheduledStartAt: scheduledTime,
          sendReminders: true,
          reminderMinutes: 5,
          reminderSentAt: null,
        },
      });

      await sendStreamReminders();

      expect(sendEmailSpy).not.toHaveBeenCalled();

      sendEmailSpy.mockRestore();
    });

    it('should respect custom reminderMinutes (10 minutes)', async () => {
      const sendEmailSpy = vi.spyOn(emailLib, 'sendEmail').mockResolvedValue(true);

      // Stream scheduled exactly 10 minutes from now
      const now = new Date();
      const scheduledTime = new Date(now.getTime() + 10 * 60 * 1000);
      
      await prisma.directStream.create({
        data: {
          slug: SLUG,
          title: 'Test Stream - 10min',
          adminPassword: await hashPassword('admin123'),
          gameId: testGameId,
          scheduledStartAt: scheduledTime,
          sendReminders: true,
          reminderMinutes: 10, // Custom reminder time
          reminderSentAt: null,
        },
      });

      await sendStreamReminders();

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Starting in 10 minutes'),
        })
      );

      sendEmailSpy.mockRestore();
    });
  });

  describe('Email Templates', () => {
    it('should render registration email with scheduled time', () => {
      const scheduledTime = new Date('2026-01-15T19:00:00Z');
      
      const html = emailLib.renderRegistrationEmail({
        firstName: 'John',
        streamTitle: 'TCHS Basketball',
        streamUrl: 'http://localhost:4300/direct/tchs',
        scheduledStartAt: scheduledTime,
      });

      expect(html).toContain('Hi John');
      expect(html).toContain('TCHS Basketball');
      expect(html).toContain('http://localhost:4300/direct/tchs');
      expect(html).toContain('SCHEDULED START');
    });

    it('should render registration email without scheduled time', () => {
      const html = emailLib.renderRegistrationEmail({
        firstName: 'Jane',
        streamTitle: 'Live Event',
        streamUrl: 'http://localhost:4300/direct/test',
      });

      expect(html).toContain('Hi Jane');
      expect(html).toContain('Live Event');
      expect(html).not.toContain('SCHEDULED START');
    });

    it('should render reminder email', () => {
      const scheduledTime = new Date('2026-01-15T19:00:00Z');
      
      const html = emailLib.renderReminderEmail({
        firstName: 'Bob',
        streamTitle: 'Championship Game',
        streamUrl: 'http://localhost:4300/direct/finals',
        reminderMinutes: 5,
        scheduledStartAt: scheduledTime,
      });

      expect(html).toContain('Hi Bob');
      expect(html).toContain('Championship Game');
      expect(html).toContain('Starting in');
      expect(html).toContain('5');
      expect(html).toContain('Minutes');
      expect(html).toContain('http://localhost:4300/direct/finals');
      expect(html).toContain('START TIME');
    });
  });
});

