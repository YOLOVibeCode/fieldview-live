/**
 * Admin Authentication Service Implementation
 * 
 * Implements IAdminAuthReader and IAdminAuthWriter.
 * Handles admin login with MFA (TOTP) support.
 */

import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

import { BadRequestError, UnauthorizedError } from '../lib/errors';
import type { IAdminAccountReader, IAdminAccountWriter } from '../repositories/IAdminAccountRepository';

import type { IAdminAuthReader, IAdminAuthWriter, AdminLoginRequest, AdminLoginResponse, MfaSetupResponse } from './IAdminAuthService';

export class AdminAuthService implements IAdminAuthReader, IAdminAuthWriter {
  constructor(
    private adminAccountReader: IAdminAccountReader,
    private adminAccountWriter: IAdminAccountWriter
  ) {}

  async login(request: AdminLoginRequest): Promise<AdminLoginResponse> {
    const { email, password, mfaToken } = request;

    // Find admin account
    const adminAccount = await this.adminAccountReader.getByEmail(email);
    if (!adminAccount) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, adminAccount.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is active
    if (adminAccount.status !== 'active') {
      throw new UnauthorizedError('Account is suspended');
    }

    // If MFA is enabled, require token
    if (adminAccount.mfaEnabled) {
      if (!mfaToken) {
        return {
          adminAccount: {
            id: adminAccount.id,
            email: adminAccount.email,
            role: adminAccount.role,
          },
          sessionToken: '', // Empty until MFA verified
          mfaRequired: true,
        };
      }

      // Verify MFA token
      if (!adminAccount.mfaSecret) {
        throw new BadRequestError('MFA secret not found');
      }

      const verified = speakeasy.totp.verify({
        secret: adminAccount.mfaSecret, // In production, decrypt this
        encoding: 'base32',
        token: mfaToken,
        window: 2, // Allow 2 time steps tolerance
      });

      if (!verified) {
        throw new UnauthorizedError('Invalid MFA token');
      }
    }

    // Update last login
    await this.adminAccountWriter.update(adminAccount.id, {
      lastLoginAt: new Date(),
    });

    // Generate session token (in production, use proper session management)
    const sessionToken = this.generateSessionToken(adminAccount.id);

    return {
      adminAccount: {
        id: adminAccount.id,
        email: adminAccount.email,
        role: adminAccount.role,
      },
      sessionToken,
      mfaRequired: false,
    };
  }

  async setupMfa(adminAccountId: string): Promise<MfaSetupResponse> {
    const adminAccount = await this.adminAccountReader.getById(adminAccountId);
    if (!adminAccount) {
      throw new UnauthorizedError('Admin account not found');
    }

    if (adminAccount.mfaEnabled) {
      throw new BadRequestError('MFA already enabled');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `FieldView (${adminAccount.email})`,
      issuer: 'FieldView',
    });

    // Store secret (in production, encrypt this)
    await this.adminAccountWriter.update(adminAccountId, {
      mfaSecret: secret.base32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  async verifyMfa(adminAccountId: string, token: string): Promise<boolean> {
    const adminAccount = await this.adminAccountReader.getById(adminAccountId);
    if (!adminAccount || !adminAccount.mfaSecret) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: adminAccount.mfaSecret, // In production, decrypt this
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      // Enable MFA
      await this.adminAccountWriter.update(adminAccountId, {
        mfaEnabled: true,
      });
    }

    return verified;
  }

  private generateSessionToken(adminAccountId: string): string {
    // In production, use proper session management (e.g., express-session with Redis)
    // For now, return a simple token (should be replaced with proper session)
    return `admin_session_${adminAccountId}_${Date.now()}`;
  }
}
