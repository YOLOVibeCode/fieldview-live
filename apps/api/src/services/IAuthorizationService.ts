/**
 * Authorization Service Interface (ISP)
 *
 * Single responsibility: check permissions for organization/channel management.
 */

export interface IAuthorizationService {
  /**
   * Assert that user can manage the organization.
   */
  assertCanManageOrganization(ownerUserId: string, organizationId: string): Promise<void>;

  /**
   * Assert that user can manage the channel (team).
   * Requires organizationId for authorization check.
   */
  assertCanManageChannel(ownerUserId: string, organizationId: string): Promise<void>;

  /**
   * Assert that user can manage the event.
   */
  assertCanManageEvent(ownerUserId: string, eventId: string): Promise<void>;

  /**
   * Check if user has any role in organization.
   */
  hasOrganizationAccess(ownerUserId: string, organizationId: string): Promise<boolean>;

  /**
   * Get user's role in organization.
   */
  getUserRoleInOrganization(ownerUserId: string, organizationId: string): Promise<'org_admin' | 'team_manager' | 'coach' | null>;
}

