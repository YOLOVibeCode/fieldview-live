/**
 * Owner Authentication Service Implementation
 * 
 * Implements IOwnerAuthReader and IOwnerAuthWriter.
 * 
 * Note: Uses OwnerUser for authentication (email/password) and OwnerAccount for account info.
 */

import type { OwnerAccount, OwnerUser } from '@prisma/client';

import { BadRequestError, UnauthorizedError } from '../lib/errors';
import { sendEmail, renderOwnerWelcomeEmail } from '../lib/email';
import { generateToken, verifyToken } from '../lib/jwt';
import { logger } from '../lib/logger';
import { hashPassword, verifyPassword } from '../lib/password';
import type {
  IOwnerAccountWriter,
  IOwnerUserReader,
  IOwnerUserWriter,
} from '../repositories/IOwnerAccountRepository';

import type {
  IOwnerAuthReader,
  IOwnerAuthWriter,
  OwnerRegistrationData,
  OwnerLoginData,
  AuthToken,
} from './IOwnerAuthService';

export class OwnerAuthService implements IOwnerAuthReader, IOwnerAuthWriter {
  constructor(
    private _ownerAccountWriter: IOwnerAccountWriter,
    private ownerUserReader: IOwnerUserReader,
    private ownerUserWriter: IOwnerUserWriter
  ) {}

  async verifyPassword(user: OwnerUser, password: string): Promise<boolean> {
    return verifyPassword(password, user.passwordHash);
  }

  verifyToken(token: string): { ownerAccountId: string } | null {
    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }
    return { ownerAccountId: payload.ownerAccountId };
  }

  async register(data: OwnerRegistrationData): Promise<{ account: OwnerAccount; token: AuthToken }> {
    // Check if email already exists
    const existingUser = await this.ownerUserReader.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create account
    const account = await this._ownerAccountWriter.create({
      contactEmail: data.email,
      name: data.name,
      type: data.type,
    });

    // Create user
    await this.ownerUserWriter.create({
      ownerAccountId: account.id,
      email: data.email,
      passwordHash,
      role: data.type === 'association' ? 'association_admin' : 'owner_admin',
    });

    // Generate token
    const token = generateToken({
      ownerAccountId: account.id,
      email: data.email,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Send welcome email asynchronously (don't block registration)
    const dashboardUrl = `${process.env.WEB_URL || 'http://localhost:4300'}/owners/dashboard`;
    void this.sendWelcomeEmail(data.name, data.email, data.type, dashboardUrl);

    return {
      account,
      token: {
        token,
        expiresAt,
      },
    };
  }

  /**
   * Send welcome email to newly registered owner
   */
  private async sendWelcomeEmail(
    name: string,
    email: string,
    accountType: 'individual' | 'association',
    dashboardUrl: string
  ): Promise<void> {
    try {
      const html = renderOwnerWelcomeEmail({
        name,
        email,
        accountType,
        dashboardUrl,
      });

      await sendEmail({
        to: email,
        subject: 'Welcome to FieldView.Live! 🎉',
        html,
      });

      logger.info({ email }, 'Welcome email sent to new owner');
    } catch (error) {
      // Log but don't fail registration if email fails
      logger.error({ error, email }, 'Failed to send welcome email');
    }
  }

  async login(data: OwnerLoginData): Promise<{ account: OwnerAccount; token: AuthToken }> {
    // Find user
    const user = await this.ownerUserReader.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValid = await this.verifyPassword(user, data.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      ownerAccountId: user.ownerAccountId,
      email: user.email,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return {
      account: user.ownerAccount,
      token: {
        token,
        expiresAt,
      },
    };
  }
}
