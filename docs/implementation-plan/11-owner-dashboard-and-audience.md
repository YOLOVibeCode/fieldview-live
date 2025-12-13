# Owner Dashboard & Audience Monitoring

## Overview

Owner dashboard with revenue analytics and audience monitoring (purchasers and watchers) with email masking for privacy.

**Functional Requirement**: FR-8

## Owner Dashboard

### Analytics Endpoint

**Endpoint**: `GET /api/owners/me/analytics`

**Response**:
```typescript
interface OwnerAnalytics {
  totalRevenueCents: number;
  totalPurchases: number;
  totalGames: number;
  averagePurchaseAmountCents: number;
  purchaseToWatchConversionRate: number; // 0-1
  revenueByGame: Array<{
    gameId: string;
    gameTitle: string;
    revenueCents: number;
    purchaseCount: number;
  }>;
  revenueByMonth: Array<{
    month: string; // YYYY-MM
    revenueCents: number;
    purchaseCount: number;
  }>;
}
```

**Implementation**:
```typescript
// apps/api/src/routes/owners.ts
app.get('/api/owners/me/analytics', requireOwnerAuth, async (req, res) => {
  const ownerAccount = await getOwnerAccountFromAuth(req);
  
  const analytics = await audienceService.getOwnerAnalytics(ownerAccount.id);
  
  res.json(analytics);
});
```

**Service Implementation**:
```typescript
// apps/api/src/services/AudienceService.ts
export async function getOwnerAnalytics(ownerAccountId: string): Promise<OwnerAnalytics> {
  // Get all purchases for owner's games
  const games = await gameRepository.listByOwner(ownerAccountId);
  const gameIds = games.map(g => g.id);
  
  const purchases = await purchaseRepository.findByGameIds(gameIds);
  const paidPurchases = purchases.filter(p => p.status === 'paid');
  
  // Calculate totals
  const totalRevenueCents = paidPurchases.reduce((sum, p) => sum + p.ownerNetCents, 0);
  const totalPurchases = paidPurchases.length;
  const totalGames = games.length;
  const averagePurchaseAmountCents = totalPurchases > 0
    ? Math.round(paidPurchases.reduce((sum, p) => sum + p.amountCents, 0) / totalPurchases)
    : 0;
  
  // Calculate conversion rate
  const purchasesWithSessions = await Promise.all(
    paidPurchases.map(async (p) => {
      const entitlement = await entitlementRepository.findByPurchaseId(p.id);
      const sessions = await playbackSessionRepository.findByEntitlementId(entitlement.id);
      return { purchase: p, hasSessions: sessions.length > 0 };
    })
  );
  
  const watchedCount = purchasesWithSessions.filter(p => p.hasSessions).length;
  const purchaseToWatchConversionRate = totalPurchases > 0
    ? watchedCount / totalPurchases
    : 0;
  
  // Revenue by game
  const revenueByGame = games.map(game => {
    const gamePurchases = paidPurchases.filter(p => p.gameId === game.id);
    return {
      gameId: game.id,
      gameTitle: game.title,
      revenueCents: gamePurchases.reduce((sum, p) => sum + p.ownerNetCents, 0),
      purchaseCount: gamePurchases.length,
    };
  });
  
  // Revenue by month
  const revenueByMonth = groupByMonth(paidPurchases);
  
  return {
    totalRevenueCents,
    totalPurchases,
    totalGames,
    averagePurchaseAmountCents,
    purchaseToWatchConversionRate,
    revenueByGame,
    revenueByMonth,
  };
}
```

## Game Audience Endpoint

### Owner Endpoint (Masked Emails)

**Endpoint**: `GET /api/owners/me/games/:gameId/audience`

**Response**:
```typescript
interface GameAudience {
  gameId: string;
  purchasers: Array<{
    purchaseId: string;
    emailMasked: string; // e.g., "j***@example.com"
    purchasedAt: Date;
    amountCents: number;
    watched: boolean;
  }>;
  watchers: Array<{
    purchaseId: string;
    emailMasked: string;
    sessionCount: number;
    lastWatchedAt: Date;
    totalWatchMs: number;
  }>;
  purchaseToWatchConversionRate: number;
}
```

**Implementation**:
```typescript
// apps/api/src/routes/owners.ts
app.get('/api/owners/me/games/:gameId/audience', requireOwnerAuth, async (req, res) => {
  const ownerAccount = await getOwnerAccountFromAuth(req);
  const { gameId } = req.params;
  
  // Verify game belongs to owner
  const game = await gameRepository.getById(gameId);
  if (game.ownerAccountId !== ownerAccount.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const audience = await audienceService.getGameAudience(gameId, ownerAccount.id, true); // maskEmails = true
  
  res.json(audience);
});
```

**Service Implementation**:
```typescript
// apps/api/src/services/AudienceService.ts
export async function getGameAudience(
  gameId: string,
  ownerAccountId: string,
  maskEmails: boolean
): Promise<GameAudience> {
  // Verify game belongs to owner
  const game = await gameRepository.getById(gameId);
  if (game.ownerAccountId !== ownerAccountId) {
    throw new Error('Forbidden');
  }
  
  // Get all purchases for this game
  const purchases = await purchaseRepository.findByGameId(gameId);
  const paidPurchases = purchases.filter(p => p.status === 'paid');
  
  // Get purchasers with viewer identity
  const purchasers = await Promise.all(
    paidPurchases.map(async (purchase) => {
      const viewer = await viewerIdentityRepository.getById(purchase.viewerId);
      const entitlement = await entitlementRepository.findByPurchaseId(purchase.id);
      const sessions = await playbackSessionRepository.findByEntitlementId(entitlement.id);
      
      return {
        purchaseId: purchase.id,
        emailMasked: maskEmails ? maskEmail(viewer.email) : viewer.email,
        purchasedAt: purchase.createdAt,
        amountCents: purchase.amountCents,
        watched: sessions.length > 0,
      };
    })
  );
  
  // Get watchers (purchases with sessions)
  const watchers = await Promise.all(
    paidPurchases
      .filter(async (p) => {
        const entitlement = await entitlementRepository.findByPurchaseId(p.id);
        const sessions = await playbackSessionRepository.findByEntitlementId(entitlement.id);
        return sessions.length > 0;
      })
      .map(async (purchase) => {
        const viewer = await viewerIdentityRepository.getById(purchase.viewerId);
        const entitlement = await entitlementRepository.findByPurchaseId(purchase.id);
        const sessions = await playbackSessionRepository.findByEntitlementId(entitlement.id);
        
        const totalWatchMs = sessions.reduce((sum, s) => sum + s.totalWatchMs, 0);
        const lastWatchedAt = sessions.reduce((latest, s) => {
          return s.startedAt > latest ? s.startedAt : latest;
        }, sessions[0].startedAt);
        
        return {
          purchaseId: purchase.id,
          emailMasked: maskEmails ? maskEmail(viewer.email) : viewer.email,
          sessionCount: sessions.length,
          lastWatchedAt,
          totalWatchMs,
        };
      })
  );
  
  const purchaseToWatchConversionRate = purchasers.length > 0
    ? watchers.length / purchasers.length
    : 0;
  
  return {
    gameId,
    purchasers,
    watchers,
    purchaseToWatchConversionRate,
  };
}
```

### Email Masking Utility

```typescript
// packages/data-model/src/utils/masking.ts
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***@***';
  
  if (localPart.length <= 1) {
    return `***@${domain}`;
  }
  
  return `${localPart[0]}***@${domain}`;
}
```

## Frontend Implementation

### Dashboard Page

**Route**: `/owner/dashboard`

**Components**:
- Revenue summary card
- Purchase count card
- Conversion rate card
- Revenue chart (by month)
- Game list with revenue

**Implementation**:
```typescript
// apps/web/app/(owner)/dashboard/page.tsx
export default async function DashboardPage() {
  const analytics = await fetchOwnerAnalytics();
  
  return (
    <div>
      <h1>Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>Total Revenue</CardHeader>
          <CardContent>${(analytics.totalRevenueCents / 100).toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>Total Purchases</CardHeader>
          <CardContent>{analytics.totalPurchases}</CardContent>
        </Card>
        <Card>
          <CardHeader>Conversion Rate</CardHeader>
          <CardContent>{(analytics.purchaseToWatchConversionRate * 100).toFixed(1)}%</CardContent>
        </Card>
      </div>
      
      <RevenueChart data={analytics.revenueByMonth} />
      <GameList games={analytics.revenueByGame} />
    </div>
  );
}
```

### Audience View Page

**Route**: `/owner/games/[id]/audience`

**Components**:
- Purchasers table (masked emails)
- Watchers table (session counts)
- Conversion metrics

**Implementation**:
```typescript
// apps/web/app/(owner)/games/[id]/audience/page.tsx
export default async function GameAudiencePage({ params }: { params: { id: string } }) {
  const audience = await fetchGameAudience(params.id);
  
  return (
    <div>
      <h1>Audience</h1>
      
      <Card>
        <CardHeader>Purchasers</CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Purchased</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Watched</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audience.purchasers.map(p => (
                <TableRow key={p.purchaseId}>
                  <TableCell>{p.emailMasked}</TableCell>
                  <TableCell>{formatDate(p.purchasedAt)}</TableCell>
                  <TableCell>${(p.amountCents / 100).toFixed(2)}</TableCell>
                  <TableCell>{p.watched ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>Watchers</CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Last Watched</TableHead>
                <TableHead>Total Watch Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audience.watchers.map(w => (
                <TableRow key={w.purchaseId}>
                  <TableCell>{w.emailMasked}</TableCell>
                  <TableCell>{w.sessionCount}</TableCell>
                  <TableCell>{formatDate(w.lastWatchedAt)}</TableCell>
                  <TableCell>{formatDuration(w.totalWatchMs)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Acceptance Criteria

- [ ] Analytics endpoint returns revenue, purchases, conversion rate
- [ ] Audience endpoint returns purchasers with masked emails
- [ ] Audience endpoint returns watchers with session counts
- [ ] Email masking works correctly (`j***@example.com`)
- [ ] Dashboard page displays analytics
- [ ] Audience page displays purchasers and watchers tables
- [ ] Tables use stack grid components (responsive)
- [ ] 100% test coverage

## Next Steps

- Proceed to [12-admin-console-and-audit.md](./12-admin-console-and-audit.md) for admin console
