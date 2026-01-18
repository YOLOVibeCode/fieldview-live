/**
 * Email Service
 * Handles email sending for notifications and reminders
 */

import { logger } from './logger';
import type { IEmailProvider } from './email/IEmailProvider';

let nodemailerInstance: typeof import('nodemailer') | null = null;

async function getTransporter() {
  if (!nodemailerInstance) {
    nodemailerInstance = await import('nodemailer');
  }

  return nodemailerInstance.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '4305'), // Mailpit default
    secure: false,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  } as any);
}

/**
 * Get email provider (for legacy compatibility)
 * Returns an IEmailProvider implementation
 */
export function getEmailProvider(): IEmailProvider {
  return {
    sendEmail: async (options) => {
      await sendEmail(options);
    },
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

/**
 * Send an email
 */
export async function sendEmail({ to, subject, html, text, from }: EmailOptions): Promise<void> {
  try {
    const transporter = await getTransporter();
    
    await transporter.sendMail({
      from: from || process.env.EMAIL_FROM || 'notifications@fieldview.live',
      to,
      subject,
      html,
      text,
    });

    logger.info({ to, subject }, 'Email sent successfully');
  } catch (error) {
    logger.error({ error, to, subject }, 'Failed to send email');
    throw error; // Re-throw to match Promise<void> contract
  }
}

/**
 * Registration confirmation email template
 */
export function renderRegistrationEmail(data: {
  firstName: string;
  streamTitle: string;
  streamUrl: string;
  scheduledStartAt?: Date;
}): string {
  const { firstName, streamTitle, streamUrl, scheduledStartAt } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Registered!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">✓ You're Registered!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 18px; color: #111827; margin-top: 0;">Hi ${firstName},</p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            You're all set to watch <strong>${streamTitle}</strong>!
          </p>
          
          ${scheduledStartAt ? `
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 25px 0;">
            <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">SCHEDULED START</p>
            <p style="margin: 5px 0 0 0; color: #1e3a8a; font-size: 18px; font-weight: 700;">
              ${scheduledStartAt.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">
            We'll send you a reminder shortly before the stream starts.
          </p>
          ` : ''}
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${streamUrl}" 
               style="display: inline-block; background-color: #1e40af; color: #ffffff; 
                      padding: 16px 48px; text-decoration: none; border-radius: 8px; 
                      font-size: 18px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              📺 Watch Stream
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Your access link: <a href="${streamUrl}" style="color: #3b82f6;">${streamUrl}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            FieldView.Live - Live Sports Streaming
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
            You're receiving this because you registered for this stream.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Owner welcome email template
 * Sent when a new owner account is registered
 */
export function renderOwnerWelcomeEmail(data: {
  name: string;
  email: string;
  accountType: 'individual' | 'association';
  dashboardUrl: string;
}): string {
  const { name, email, accountType, dashboardUrl } = data;
  const accountTypeLabel = accountType === 'association' ? 'Association' : 'Individual';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to FieldView.Live!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%); padding: 50px 20px; text-align: center;">
          <div style="font-size: 56px; margin-bottom: 15px;">📹</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
            Welcome to FieldView.Live!
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 18px;">
            Your journey to monetize your streams starts now
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 45px 35px;">
          <p style="font-size: 20px; color: #f1f5f9; margin-top: 0; font-weight: 500;">
            Hey ${name}! 👋
          </p>
          
          <p style="font-size: 16px; color: #94a3b8; line-height: 1.7;">
            Thanks for joining FieldView.Live! Your <strong style="color: #f1f5f9;">${accountTypeLabel} account</strong> 
            is ready to go. Here's what you can do:
          </p>
          
          <!-- Features -->
          <div style="margin: 30px 0;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 20px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border-left: 3px solid #3b82f6;">
              <span style="font-size: 24px; margin-right: 15px;">💰</span>
              <div>
                <p style="margin: 0; color: #f1f5f9; font-weight: 600;">Monetize Your Streams</p>
                <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">Set up paywall pricing and get paid directly via Square</p>
              </div>
            </div>
            
            <div style="display: flex; align-items: flex-start; margin-bottom: 20px; padding: 15px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; border-left: 3px solid #8b5cf6;">
              <span style="font-size: 24px; margin-right: 15px;">🔒</span>
              <div>
                <p style="margin: 0; color: #f1f5f9; font-weight: 600;">IP-Locked Links</p>
                <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">Each purchase grants access to one household only</p>
              </div>
            </div>
            
            <div style="display: flex; align-items: flex-start; padding: 15px; background: rgba(236, 72, 153, 0.1); border-radius: 12px; border-left: 3px solid #ec4899;">
              <span style="font-size: 24px; margin-right: 15px;">🎁</span>
              <div>
                <p style="margin: 0; color: #f1f5f9; font-weight: 600;">5 Free Games</p>
                <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 14px;">Try the platform free - create up to 5 games without a paywall</p>
              </div>
            </div>
          </div>
          
          <!-- Quick Start -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%); border: 1px solid #334155; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; color: #f1f5f9; font-size: 18px;">🚀 Quick Start Guide</h3>
            <ol style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 15px; line-height: 1.8;">
              <li><strong style="color: #f1f5f9;">Connect Square</strong> - Link your payment account</li>
              <li><strong style="color: #f1f5f9;">Create a Game</strong> - Set up your first stream event</li>
              <li><strong style="color: #f1f5f9;">Share the Link</strong> - Send to your team/fans</li>
              <li><strong style="color: #f1f5f9;">Get Paid!</strong> - Collect payments via Square</li>
            </ol>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${dashboardUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); 
                      color: #ffffff; padding: 18px 50px; text-decoration: none; border-radius: 12px; 
                      font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);">
              Go to Dashboard →
            </a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 30px;">
            Questions? Reply to this email and we'll help you out!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">
            FieldView.Live - Turn Your Veo Stream Into Revenue
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #475569;">
            Account: ${email}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Pre-stream reminder email template (5 minutes before)
 */
export function renderReminderEmail(data: {
  firstName: string;
  streamTitle: string;
  streamUrl: string;
  reminderMinutes: number;
  scheduledStartAt: Date;
}): string {
  const { firstName, streamTitle, streamUrl, reminderMinutes, scheduledStartAt } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stream Starting Soon!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">🔴</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Starting in ${reminderMinutes} Minutes!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 18px; color: #111827; margin-top: 0;">Hi ${firstName},</p>
          
          <p style="font-size: 20px; color: #dc2626; font-weight: 600; line-height: 1.4;">
            <strong>${streamTitle}</strong> is starting in ${reminderMinutes} minutes!
          </p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0;">
            <p style="margin: 0; color: #7f1d1d; font-size: 14px; font-weight: 600;">START TIME</p>
            <p style="margin: 5px 0 0 0; color: #991b1b; font-size: 18px; font-weight: 700;">
              ${scheduledStartAt.toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </p>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Don't miss out! Click the button below to join the stream.
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${streamUrl}" 
               style="display: inline-block; background-color: #dc2626; color: #ffffff; 
                      padding: 18px 60px; text-decoration: none; border-radius: 8px; 
                      font-size: 20px; font-weight: 700; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      animation: pulse 2s infinite;">
              📺 JOIN STREAM NOW
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            FieldView.Live - Live Sports Streaming
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
            You're receiving this reminder because you registered for this stream.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

