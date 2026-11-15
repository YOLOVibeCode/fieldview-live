/**
 * Camera Source Repository Interfaces (ISP)
 *
 * A camera source is a connected camera-platform account (Veo, …) per owner.
 * `secrets` values are ciphertexts here — encryption lives in modules/camera-sources/secrets.
 */

export type CameraSourceStatus = 'active' | 'needs_reconnect';

export interface CameraSourceRecord {
  id: string;
  ownerAccountId: string;
  provider: string;
  config: Record<string, unknown>;
  /** { name: ciphertext } */
  secrets: Record<string, unknown>;
  status: CameraSourceStatus;
}

export interface UpsertCameraSourceData {
  ownerAccountId: string;
  provider: string;
  config: Record<string, unknown>;
  /** { name: ciphertext } — already encrypted. */
  secrets: Record<string, string>;
}

/**
 * Reader Interface (ISP)
 */
export interface ICameraSourceReader {
  listByOwner(ownerAccountId: string): Promise<CameraSourceRecord[]>;
}

/**
 * Writer Interface (ISP)
 */
export interface ICameraSourceWriter {
  /** Create or replace the owner's source for a provider; resets status to 'active'. */
  upsert(data: UpsertCameraSourceData): Promise<CameraSourceRecord>;
  setStatus(id: string, status: CameraSourceStatus): Promise<void>;
}
