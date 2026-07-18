/**
 * Tests for AuthEmailService
 * 
 * Note: These tests verify email content generation.
 * Integration tests in services will verify actual email sending.
 */
import { describe, it, expect } from 'vitest';
import { AuthEmailService } from '../authEmailService';

describe('AuthEmailService', () => {
  const service = new AuthEmailService();

  describe('Password Reset Email Content', () => {
    it('should generate password reset email with personalization', () => {
      // Access private method via type assertion for testing
      const html = (service as any).buildPasswordResetHtml({
        resetUrl: 'https://fieldview.live/reset?token=abc123',
        expiryMinutes: 15,
        userType: 'owner_user',
        firstName: 'John',
      });

      expect(html).toContain('Hi John');
      expect(html).toContain('abc123');
      expect(html).toContain('15 minutes');
      expect(html).toContain('FieldView.Live');
      expect(html).toContain('<html>');
      expect(html).not.toContain('MFA'); // Owner users don't get MFA warning
    });

    it('should generate admin password reset email with MFA warning', () => {
      const html = (service as any).buildPasswordResetHtml({
        resetUrl: 'https://fieldview.live/reset?token=xyz789',
        expiryMinutes: 10,
        userType: 'admin_account',
      });

      expect(html).toContain('Hello'); // No firstName
      expect(html).toContain('xyz789');
      expect(html).toContain('10 minutes');
      expect(html).toContain('MFA'); // Admin gets MFA warning
      expect(html).toContain('admin');
    });

    it('should generate plain text version of password reset email', () => {
      const text = (service as any).buildPasswordResetText({
        resetUrl: 'https://fieldview.live/reset?token=test123',
        expiryMinutes: 15,
        userType: 'owner_user',
        firstName: 'Sarah',
      });

      expect(text).toContain('Hi Sarah');
      expect(text).toContain('test123');
      expect(text).toContain('15 minutes');
      expect(text).not.toContain('<html>');
      expect(text).not.toContain('<');
    });
  });

  describe('Viewer Refresh Email Content', () => {
    it('should generate viewer refresh email with stream title', () => {
      const html = (service as any).buildViewerRefreshHtml({
        refreshUrl: 'https://fieldview.live/verify?token=viewer123',
        firstName: 'Mike',
        streamTitle: 'TCHS vs Storm FC',
      });

      expect(html).toContain('Hi Mike');
      expect(html).toContain('TCHS vs Storm FC');
      expect(html).toContain('viewer123');
      expect(html).toContain('15 minutes');
      expect(html).toContain('FieldView.Live');
    });

    it('should generate viewer refresh email without personalization', () => {
      const html = (service as any).buildViewerRefreshHtml({
        refreshUrl: 'https://fieldview.live/verify?token=viewer456',
      });

      expect(html).toContain('Hello');
      expect(html).toContain('viewer456');
      expect(html).toContain('Your viewing session has expired');
      expect(html).not.toContain('viewing session for'); // No stream title
    });

    it('should generate plain text version of viewer refresh email', () => {
      const text = (service as any).buildViewerRefreshText({
        refreshUrl: 'https://fieldview.live/verify?token=test789',
        firstName: 'Alex',
        streamTitle: 'Soccer Match',
      });

      expect(text).toContain('Hi Alex');
      expect(text).toContain('Soccer Match');
      expect(text).toContain('test789');
      expect(text).not.toContain('<html>');
      expect(text).not.toContain('<');
    });
  });

  describe('Email Content Standards', () => {
    it('should include current year in all email footers', () => {
      const currentYear = new Date().getFullYear().toString();

      const passwordHtml = (service as any).buildPasswordResetHtml({
        resetUrl: 'https://test.com',
        expiryMinutes: 15,
        userType: 'owner_user',
      });

      const viewerHtml = (service as any).buildViewerRefreshHtml({
        refreshUrl: 'https://test.com',
      });

      expect(passwordHtml).toContain(currentYear);
      expect(viewerHtml).toContain(currentYear);
    });

    it('should generate valid HTML structure', () => {
      const html = (service as any).buildPasswordResetHtml({
        resetUrl: 'https://test.com',
        expiryMinutes: 15,
        userType: 'owner_user',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<body');
      expect(html).toContain('</body>');
    });

    it('should use consistent branding', () => {
      const passwordHtml = (service as any).buildPasswordResetHtml({
        resetUrl: 'https://test.com',
        expiryMinutes: 15,
        userType: 'owner_user',
      });

      const viewerHtml = (service as any).buildViewerRefreshHtml({
        refreshUrl: 'https://test.com',
      });

      expect(passwordHtml).toContain('FieldView.Live');
      expect(viewerHtml).toContain('FieldView.Live');
      expect(viewerHtml).toContain('🎬'); // Cinema emoji for viewer emails
    });
  });
});
