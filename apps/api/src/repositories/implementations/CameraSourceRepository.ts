/**
 * Camera Source Repository Implementation
 *
 * Prisma-based implementation of ICameraSourceReader and ICameraSourceWriter.
 */

import type { CameraSource, Prisma, PrismaClient } from '@prisma/client';

import type {
  CameraSourceRecord,
  CameraSourceStatus,
  ICameraSourceReader,
  ICameraSourceWriter,
  UpsertCameraSourceData,
} from '../ICameraSourceRepository';

function asObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toRecord(row: CameraSource): CameraSourceRecord {
  return {
    id: row.id,
    ownerAccountId: row.ownerAccountId,
    provider: row.provider,
    config: asObject(row.config),
    secrets: asObject(row.secrets),
    status: row.status === 'needs_reconnect' ? 'needs_reconnect' : 'active',
  };
}

export class CameraSourceRepository implements ICameraSourceReader, ICameraSourceWriter {
  constructor(private prisma: PrismaClient) {}

  async listByOwner(ownerAccountId: string): Promise<CameraSourceRecord[]> {
    const rows = await this.prisma.cameraSource.findMany({
      where: { ownerAccountId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRecord);
  }

  async upsert(data: UpsertCameraSourceData): Promise<CameraSourceRecord> {
    const values = {
      config: data.config as Prisma.InputJsonObject,
      secrets: data.secrets as Prisma.InputJsonObject,
      status: 'active',
    };
    const row = await this.prisma.cameraSource.upsert({
      where: { ownerAccountId_provider: { ownerAccountId: data.ownerAccountId, provider: data.provider } },
      create: { ownerAccountId: data.ownerAccountId, provider: data.provider, ...values },
      update: values,
    });
    return toRecord(row);
  }

  async setStatus(id: string, status: CameraSourceStatus): Promise<void> {
    await this.prisma.cameraSource.update({ where: { id }, data: { status } });
  }

  async updateSecrets(id: string, secrets: Record<string, string>): Promise<void> {
    await this.prisma.cameraSource.update({ where: { id }, data: { secrets: secrets as Prisma.InputJsonObject } });
  }
}
