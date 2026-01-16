/**
 * Auto-Registration Service Implementation
 * 
 * Handles auto-registration of existing viewers to new streams
 * Implements ISP for testability
 */

import type {
  IAutoRegistrationService,
  IRegistrationChecker,
  IRegistrationCreator,
  IViewerIdentityReader,
  IDirectStreamReader,
} from './auto-registration.interfaces';
import type { ViewerIdentity, DirectStreamRegistration } from '@prisma/client';

export class AutoRegistrationService implements IAutoRegistrationService {
  constructor(
    private registrationChecker: IRegistrationChecker,
    private registrationCreator: IRegistrationCreator,
    private viewerIdentityReader: IViewerIdentityReader,
    private directStreamReader: IDirectStreamReader
  ) {}

  async autoRegister(
    streamSlug: string,
    viewerIdentityId: string
  ): Promise<{
    registration: DirectStreamRegistration & {
      viewerIdentity: ViewerIdentity;
    };
    isNewRegistration: boolean;
  }> {
    // 1. Verify stream exists
    const stream = await this.directStreamReader.getBySlug(streamSlug);
    if (!stream) {
      throw new Error(`Stream not found: ${streamSlug}`);
    }

    // 2. Verify viewer exists
    const viewer = await this.viewerIdentityReader.getById(viewerIdentityId);
    if (!viewer) {
      throw new Error(`Viewer identity not found: ${viewerIdentityId}`);
    }

    // 3. Check if already registered
    const existingRegistration =
      await this.registrationChecker.getExistingRegistration(stream.id, viewerIdentityId);

    if (existingRegistration) {
      // Return existing registration
      return {
        registration: {
          ...existingRegistration,
          viewerIdentity: viewer,
        },
        isNewRegistration: false,
      };
    }

    // 4. Create new registration
    const newRegistration = await this.registrationCreator.createRegistration(
      stream.id,
      viewerIdentityId
    );

    return {
      registration: {
        ...newRegistration,
        viewerIdentity: viewer,
      },
      isNewRegistration: true,
    };
  }
}

