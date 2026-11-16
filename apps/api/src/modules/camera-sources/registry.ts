/**
 * Camera provider registry — the one list of camera platforms FieldView can talk to.
 * To add a platform: implement ILiveStreamLister + ICameraConnector under
 * `providers/<name>/` and add its provider to `createCameraProviderRegistry`.
 */

import type { ICameraProvider, ICameraProviderRegistry } from './interfaces';
import { createVeoProvider } from './providers/veo';

export class CameraProviderRegistry implements ICameraProviderRegistry {
  private readonly byId: ReadonlyMap<string, ICameraProvider>;

  constructor(private readonly providers: readonly ICameraProvider[]) {
    this.byId = new Map(providers.map((p) => [p.id, p]));
  }

  get(id: string): ICameraProvider {
    const provider = this.byId.get(id);
    if (!provider) {
      throw new Error(`Unknown camera provider: "${id}". Valid ids: ${[...this.byId.keys()].join(', ')}`);
    }
    return provider;
  }

  list(): readonly ICameraProvider[] {
    return this.providers;
  }
}

export function createCameraProviderRegistry(): ICameraProviderRegistry {
  return new CameraProviderRegistry([createVeoProvider()]);
}
