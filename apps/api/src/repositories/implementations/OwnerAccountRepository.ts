/**
 * Owner Account Repository Implementation (Prisma)
 * 
 * Implements IOwnerAccountReader and IOwnerAccountWriter.
 */

import { PrismaClient, type OwnerAccount, type OwnerUser } from '@prisma/client';

import type {
  IOwnerAccountReader,
  IOwnerAccountWriter,
  IOwnerUserReader,
  IOwnerUserWriter,
  CreateOwnerAccountData,
  CreateOwnerUserData,
  UpdateOwnerAccountData,
} from '../IOwnerAccountRepository';

export class OwnerAccountRepository implements IOwnerAccountReader, IOwnerAccountWriter {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<OwnerAccount | null> {
    return this.prisma.ownerAccount.findUnique({
      where: { id },
    });
  }

  async findByContactEmail(email: string): Promise<OwnerAccount | null> {
    return this.prisma.ownerAccount.findFirst({
      where: { contactEmail: email },
    });
  }

  async create(data: CreateOwnerAccountData): Promise<OwnerAccount> {
    return this.prisma.ownerAccount.create({
      data: {
        contactEmail: data.contactEmail,
        name: data.name,
        type: data.type,
        status: 'pending_verification',
        payoutProviderRef: data.payoutProviderRef,
      },
    });
  }

  async update(id: string, data: UpdateOwnerAccountData): Promise<OwnerAccount> {
    return this.prisma.ownerAccount.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.payoutProviderRef !== undefined && { payoutProviderRef: data.payoutProviderRef }),
        ...(data.squareAccessTokenEncrypted !== undefined && { squareAccessTokenEncrypted: data.squareAccessTokenEncrypted }),
        ...(data.squareRefreshTokenEncrypted !== undefined && { squareRefreshTokenEncrypted: data.squareRefreshTokenEncrypted }),
        ...(data.squareTokenExpiresAt !== undefined && { squareTokenExpiresAt: data.squareTokenExpiresAt }),
        ...(data.squareLocationId !== undefined && { squareLocationId: data.squareLocationId }),
      },
    });
  }
}

export class OwnerUserRepository implements IOwnerUserReader, IOwnerUserWriter {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<(OwnerUser & { ownerAccount: OwnerAccount }) | null> {
    return this.prisma.ownerUser.findUnique({
      where: { email },
      include: { ownerAccount: true },
    });
  }

  async findByOwnerAccountId(ownerAccountId: string): Promise<OwnerUser[]> {
    return this.prisma.ownerUser.findMany({
      where: { ownerAccountId },
    });
  }

  async create(data: CreateOwnerUserData): Promise<OwnerUser> {
    return this.prisma.ownerUser.create({
      data: {
        ownerAccountId: data.ownerAccountId,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    });
  }
}
