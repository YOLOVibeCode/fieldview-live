/**
 * Platform Revenue Service
 *
 * Aggregates platform-wide revenue from all paid purchases.
 * Platform revenue = sum of all platformFeeCents from paid purchases.
 */

import type { PrismaClient } from '@prisma/client';

export interface RevenueByMonth {
  month: string; // YYYY-MM format
  platformFeeCents: number;
  processorFeeCents: number;
  grossCents: number;
  purchaseCount: number;
}

export interface TopOwner {
  ownerAccountId: string;
  name: string;
  contactEmail: string;
  platformFeeCents: number;
  grossCents: number;
  purchaseCount: number;
}

export interface PlatformRevenueStats {
  totalPlatformRevenueCents: number;
  totalProcessorFeeCents: number;
  totalGrossRevenueCents: number;
  totalPurchases: number;
  thisMonthRevenueCents: number;
  thisWeekRevenueCents: number;
  revenueByMonth: RevenueByMonth[];
  topOwners: TopOwner[];
}

export class PlatformRevenueService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get comprehensive platform revenue statistics.
   */
  async getRevenueStats(): Promise<PlatformRevenueStats> {
    const now = new Date();

    // Start of this month (UTC)
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Start of this week (Monday)
    const dayOfWeek = now.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToMonday));

    // All-time totals for paid purchases
    const totals = await this.prisma.purchase.aggregate({
      where: { status: 'paid' },
      _sum: {
        platformFeeCents: true,
        processorFeeCents: true,
        amountCents: true,
      },
      _count: { id: true },
    });

    // This month's platform fee
    const thisMonthTotals = await this.prisma.purchase.aggregate({
      where: {
        status: 'paid',
        paidAt: { gte: startOfMonth },
      },
      _sum: { platformFeeCents: true },
    });

    // This week's platform fee
    const thisWeekTotals = await this.prisma.purchase.aggregate({
      where: {
        status: 'paid',
        paidAt: { gte: startOfWeek },
      },
      _sum: { platformFeeCents: true },
    });

    // Revenue by month (last 12 months)
    const revenueByMonth = await this.getRevenueByMonth(12);

    // Top owners by platform fee generated
    const topOwners = await this.getTopOwners(10);

    return {
      totalPlatformRevenueCents: totals._sum.platformFeeCents ?? 0,
      totalProcessorFeeCents: totals._sum.processorFeeCents ?? 0,
      totalGrossRevenueCents: totals._sum.amountCents ?? 0,
      totalPurchases: totals._count.id,
      thisMonthRevenueCents: thisMonthTotals._sum.platformFeeCents ?? 0,
      thisWeekRevenueCents: thisWeekTotals._sum.platformFeeCents ?? 0,
      revenueByMonth,
      topOwners,
    };
  }

  /**
   * Get revenue breakdown by month.
   */
  async getRevenueByMonth(months: number = 12): Promise<RevenueByMonth[]> {
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));

    // Use raw query for grouping by month
    const result = await this.prisma.$queryRaw<
      Array<{
        month: string;
        platformFeeCents: bigint;
        processorFeeCents: bigint;
        grossCents: bigint;
        purchaseCount: bigint;
      }>
    >`
      SELECT
        TO_CHAR("paidAt", 'YYYY-MM') as month,
        COALESCE(SUM("platformFeeCents"), 0) as "platformFeeCents",
        COALESCE(SUM("processorFeeCents"), 0) as "processorFeeCents",
        COALESCE(SUM("amountCents"), 0) as "grossCents",
        COUNT(*)::bigint as "purchaseCount"
      FROM "Purchase"
      WHERE status = 'paid'
        AND "paidAt" >= ${startDate}
      GROUP BY TO_CHAR("paidAt", 'YYYY-MM')
      ORDER BY month DESC
    `;

    return result.map((row) => ({
      month: row.month,
      platformFeeCents: Number(row.platformFeeCents),
      processorFeeCents: Number(row.processorFeeCents),
      grossCents: Number(row.grossCents),
      purchaseCount: Number(row.purchaseCount),
    }));
  }

  /**
   * Get top revenue-generating owners.
   */
  async getTopOwners(limit: number = 10): Promise<TopOwner[]> {
    // Group purchases by recipientOwnerAccountId
    const result = await this.prisma.$queryRaw<
      Array<{
        ownerAccountId: string;
        platformFeeCents: bigint;
        grossCents: bigint;
        purchaseCount: bigint;
      }>
    >`
      SELECT
        "recipientOwnerAccountId" as "ownerAccountId",
        COALESCE(SUM("platformFeeCents"), 0) as "platformFeeCents",
        COALESCE(SUM("amountCents"), 0) as "grossCents",
        COUNT(*)::bigint as "purchaseCount"
      FROM "Purchase"
      WHERE status = 'paid'
        AND "recipientOwnerAccountId" IS NOT NULL
      GROUP BY "recipientOwnerAccountId"
      ORDER BY "platformFeeCents" DESC
      LIMIT ${limit}
    `;

    // Fetch owner account details
    const ownerIds = result.map((r) => r.ownerAccountId);
    const owners = await this.prisma.ownerAccount.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true, contactEmail: true },
    });

    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    return result.map((row) => {
      const owner = ownerMap.get(row.ownerAccountId);
      return {
        ownerAccountId: row.ownerAccountId,
        name: owner?.name ?? 'Unknown',
        contactEmail: owner?.contactEmail ?? 'unknown@unknown.com',
        platformFeeCents: Number(row.platformFeeCents),
        grossCents: Number(row.grossCents),
        purchaseCount: Number(row.purchaseCount),
      };
    });
  }
}
