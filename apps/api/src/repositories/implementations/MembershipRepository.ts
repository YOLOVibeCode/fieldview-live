/**
 * Membership Repository (Prisma)
 *
 * Prisma-backed implementation for Organization membership read/write operations.
 */

import type { PrismaClient, OrganizationMember } from '@prisma/client';

import type { IMembershipReaderRepo, IMembershipWriterRepo } from '../IMembershipRepository';

export class MembershipRepository implements IMembershipReaderRepo, IMembershipWriterRepo {
  constructor(private prisma: PrismaClient) {}

  async getMembershipByUserIdAndOrgId(ownerUserId: string, organizationId: string): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findUnique({
      where: { ownerUserId_organizationId: { ownerUserId, organizationId } },
    });
  }

  async listMembershipsByOrganization(organizationId: string): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMembershipsByUser(ownerUserId: string): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMembershipsByRole(organizationId: string, role: 'org_admin' | 'team_manager' | 'coach'): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: { organizationId, role },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMembership(input: {
    ownerUserId: string;
    organizationId: string;
    role: 'org_admin' | 'team_manager' | 'coach';
  }): Promise<OrganizationMember> {
    return this.prisma.organizationMember.create({ data: input });
  }

  async updateMembershipRole(membershipId: string, role: 'org_admin' | 'team_manager' | 'coach'): Promise<OrganizationMember> {
    return this.prisma.organizationMember.update({
      where: { id: membershipId },
      data: { role },
    });
  }

  async deleteMembership(membershipId: string): Promise<void> {
    await this.prisma.organizationMember.delete({ where: { id: membershipId } });
  }

  async deleteMembershipByUserAndOrg(ownerUserId: string, organizationId: string): Promise<void> {
    await this.prisma.organizationMember.delete({
      where: { ownerUserId_organizationId: { ownerUserId, organizationId } },
    });
  }
}

