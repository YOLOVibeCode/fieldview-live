/**
 * Membership Repository Interfaces (ISP)
 *
 * Segregated read/write interfaces for Organization membership management.
 */

import type { OrganizationMember } from '@prisma/client';

export interface IMembershipReaderRepo {
  getMembershipByUserIdAndOrgId(ownerUserId: string, organizationId: string): Promise<OrganizationMember | null>;
  listMembershipsByOrganization(organizationId: string): Promise<OrganizationMember[]>;
  listMembershipsByUser(ownerUserId: string): Promise<OrganizationMember[]>;
  getMembershipsByRole(organizationId: string, role: 'org_admin' | 'team_manager' | 'coach'): Promise<OrganizationMember[]>;
}

export interface IMembershipWriterRepo {
  createMembership(input: {
    ownerUserId: string;
    organizationId: string;
    role: 'org_admin' | 'team_manager' | 'coach';
  }): Promise<OrganizationMember>;
  updateMembershipRole(membershipId: string, role: 'org_admin' | 'team_manager' | 'coach'): Promise<OrganizationMember>;
  deleteMembership(membershipId: string): Promise<void>;
  deleteMembershipByUserAndOrg(ownerUserId: string, organizationId: string): Promise<void>;
}

