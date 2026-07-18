/**
 * Authorization Service
 *
 * Checks permissions for organization/channel/event management.
 */

import { UnauthorizedError } from '../lib/errors';

import type { IMembershipReaderRepo } from '../repositories/IMembershipRepository';
import type { IEventReaderRepo } from '../repositories/IEventRepository';

import type { IAuthorizationService } from './IAuthorizationService';

export class AuthorizationService implements IAuthorizationService {
  constructor(
    private membershipReader: IMembershipReaderRepo,
    private eventReader: IEventReaderRepo
  ) {}

  async assertCanManageOrganization(ownerUserId: string, organizationId: string): Promise<void> {
    const membership = await this.membershipReader.getMembershipByUserIdAndOrgId(ownerUserId, organizationId);
    if (!membership) {
      throw new UnauthorizedError('User does not have access to this organization');
    }
    if (membership.role !== 'org_admin' && membership.role !== 'team_manager') {
      throw new UnauthorizedError('User does not have permission to manage this organization');
    }
  }

  async assertCanManageChannel(ownerUserId: string, organizationId: string): Promise<void> {
    await this.assertCanManageOrganization(ownerUserId, organizationId);
  }

  async assertCanManageEvent(ownerUserId: string, eventId: string): Promise<void> {
    const event = await this.eventReader.getEventById(eventId);
    if (!event) {
      throw new UnauthorizedError('Event not found');
    }
    await this.assertCanManageOrganization(ownerUserId, event.organizationId);
  }

  async hasOrganizationAccess(ownerUserId: string, organizationId: string): Promise<boolean> {
    const membership = await this.membershipReader.getMembershipByUserIdAndOrgId(ownerUserId, organizationId);
    return membership !== null;
  }

  async getUserRoleInOrganization(ownerUserId: string, organizationId: string): Promise<'org_admin' | 'team_manager' | 'coach' | null> {
    const membership = await this.membershipReader.getMembershipByUserIdAndOrgId(ownerUserId, organizationId);
    if (!membership) return null;
    const role = membership.role;
    if (role === 'org_admin' || role === 'team_manager' || role === 'coach') {
      return role;
    }
    return null;
  }
}

