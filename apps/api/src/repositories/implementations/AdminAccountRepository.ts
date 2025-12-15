/**
 * Admin Account Repository Implementation
 * 
 * Prisma-based implementation of IAdminAccountReader and IAdminAccountWriter.
 */

import type { PrismaClient, AdminAccount } from '@prisma/client';

import type {
  IAdminAccountReader,
  IAdminAccountWriter,
  CreateAdminAccountData,
  UpdateAdminAccountData,
} from '../IAdminAccountRepository';

export class AdminAccountRepository implements IAdminAccountReader, IAdminAccountWriter {
  constructor(private prisma: PrismaClient) {}

  async getById(id: string): Promise<AdminAccount | null> {
    return this.prisma.adminAccount.findUnique({
      where: { id },
    });
  }

  async getByEmail(email: string): Promise<AdminAccount | null> {
    return this.prisma.adminAccount.findUnique({
      where: { email },
    });
  }

  async create(data: CreateAdminAccountData): Promise<AdminAccount> {
    return this.prisma.adminAccount.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        status: 'active',
      },
    });
  }

  async update(id: string, data: UpdateAdminAccountData): Promise<AdminAccount> {
    return this.prisma.adminAccount.update({
      where: { id },
      data: {
        ...data,
        lastLoginAt: data.lastLoginAt === null ? null : data.lastLoginAt,
        mfaSecret: data.mfaSecret === null ? null : data.mfaSecret,
      },
    });
  }
}
