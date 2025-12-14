/**
 * Viewer Identity Repository Interfaces (ISP)
 * 
 * Segregated interfaces for ViewerIdentity operations.
 */

import type { ViewerIdentity } from '@prisma/client';

export interface CreateViewerIdentityData {
  email: string;
  phoneE164?: string;
}

export interface UpdateViewerIdentityData {
  phoneE164?: string;
  smsOptOut?: boolean;
  optOutAt?: Date;
  lastSeenAt?: Date;
}

/**
 * Reader Interface (ISP)
 */
export interface IViewerIdentityReader {
  getById(id: string): Promise<ViewerIdentity | null>;
  getByEmail(email: string): Promise<ViewerIdentity | null>;
  getByPhone(phoneE164: string): Promise<ViewerIdentity | null>;
}

/**
 * Writer Interface (ISP)
 */
export interface IViewerIdentityWriter {
  create(data: CreateViewerIdentityData): Promise<ViewerIdentity>;
  update(id: string, data: UpdateViewerIdentityData): Promise<ViewerIdentity>;
}
