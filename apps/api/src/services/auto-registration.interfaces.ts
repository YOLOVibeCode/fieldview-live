/**
 * Auto-Registration Service Interfaces (ISP)
 * 
 * Segregated interfaces for auto-registering existing viewers to new streams
 */

import type { ViewerIdentity, DirectStreamRegistration, DirectStream } from '@prisma/client';

/**
 * Interface for checking existing registrations
 */
export interface IRegistrationChecker {
  /**
   * Check if a viewer is already registered for a stream
   */
  isViewerRegistered(streamId: string, viewerIdentityId: string): Promise<boolean>;
  
  /**
   * Get existing registration if it exists
   */
  getExistingRegistration(
    streamId: string,
    viewerIdentityId: string
  ): Promise<DirectStreamRegistration | null>;
}

/**
 * Interface for creating registrations
 */
export interface IRegistrationCreator {
  /**
   * Create a new registration for a viewer on a stream
   */
  createRegistration(
    streamId: string,
    viewerIdentityId: string
  ): Promise<DirectStreamRegistration>;
}

/**
 * Interface for reading viewer identity
 */
export interface IViewerIdentityReader {
  /**
   * Get viewer identity by ID
   */
  getById(id: string): Promise<ViewerIdentity | null>;
}

/**
 * Interface for reading direct stream
 */
export interface IDirectStreamReader {
  /**
   * Get direct stream by slug
   */
  getBySlug(slug: string): Promise<DirectStream | null>;
}

/**
 * Combined auto-registration service interface
 */
export interface IAutoRegistrationService {
  /**
   * Auto-register an existing viewer for a new stream
   * 
   * @param streamSlug - The stream slug to register for
   * @param viewerIdentityId - The existing viewer identity ID
   * @returns Registration with viewer identity
   * @throws Error if stream not found, viewer not found, or registration fails
   */
  autoRegister(
    streamSlug: string,
    viewerIdentityId: string
  ): Promise<{
    registration: DirectStreamRegistration & {
      viewerIdentity: ViewerIdentity;
    };
    isNewRegistration: boolean;
  }>;
}

/**
 * Request/Response types for API endpoint
 */
export interface AutoRegisterRequest {
  directStreamSlug: string;
  viewerIdentityId: string;
}

export interface AutoRegisterResponse {
  registration: {
    id: string;
    directStreamId: string;
    viewerIdentityId: string;
    registeredAt: string;
    accessToken: string | null;
    viewerIdentity: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  };
  isNewRegistration: boolean;
}

