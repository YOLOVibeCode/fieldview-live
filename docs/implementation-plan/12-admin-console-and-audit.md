# Admin Console & Audit Logging

## Overview

Admin console with MFA, global search, purchase timeline, audience drill-down, and comprehensive audit logging.

**Functional Requirement**: FR-9

## Admin Authentication & MFA

### MFA Setup (TOTP)

**Flow**:
1. Admin logs in with email/password
2. If MFA not enabled, prompt to set up
3. Generate TOTP secret, show QR code
4. Admin scans QR code with authenticator app
5. Admin verifies with TOTP code
6. MFA enabled, store encrypted secret

**Implementation**:
```typescript
// apps/api/src/routes/admin.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

app.post('/api/admin/mfa/setup', requireAdminAuth, async (req, res) => {
  const adminUser = req.user;
  
  if (adminUser.mfaEnabled) {
    return res.status(400).json({ error: 'MFA already enabled' });
  }
  
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `FieldView (${adminUser.email})`,
    issuer: 'FieldView',
  });
  
  // Store secret temporarily (encrypted)
  const encryptedSecret = encrypt(secret.base32);
  await adminUserRepository.update(adminUser.id, {
    mfaSecret: encryptedSecret,
  });
  
  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
  
  res.json({
    secret: secret.base32,
    qrCodeUrl,
  });
});

app.post('/api/admin/mfa/verify', requireAdminAuth, async (req, res) => {
  const { token } = req.body;
  const adminUser = req.user;
  
  const decryptedSecret = decrypt(adminUser.mfaSecret!);
  
  const verified = speakeasy.totp.verify({
    secret: decryptedSecret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps tolerance
  });
  
  if (!verified) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Enable MFA
  await adminUserRepository.update(adminUser.id, {
    mfaEnabled: true,
  });
  
  res.json({ success: true });
});
```

### Admin Login with MFA

```typescript
app.post('/api/admin/login', async (req, res) => {
  const { email, password, mfaToken } = req.body;
  
  // Verify email/password
  const adminUser = await adminUserRepository.findByEmail(email);
  if (!adminUser || !verifyPassword(password, adminUser.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // If MFA enabled, require token
  if (adminUser.mfaEnabled) {
    if (!mfaToken) {
      return res.status(401).json({ error: 'MFA token required' });
    }
    
    const decryptedSecret = decrypt(adminUser.mfaSecret!);
    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: mfaToken,
      window: 2,
    });
    
    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA token' });
    }
  }
  
  // Create session
  const session = await createAdminSession(adminUser.id);
  
  res.json({
    adminUser: {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    },
    sessionToken: session.token,
  });
});
```

## Global Search

### Search Endpoint

**Endpoint**: `GET /api/admin/search?q=<query>`

**Searches**:
- Email (ViewerIdentity)
- Phone (ViewerIdentity)
- Keyword (Game)

**Response**:
```typescript
interface SearchResults {
  viewers: Array<{
    id: string;
    email: string; // Full email for SuperAdmin
    emailMasked?: string; // Masked for SupportAdmin
    phoneE164?: string;
    purchaseCount: number;
  }>;
  games: Array<{
    id: string;
    title: string;
    keywordCode: string;
    ownerAccountName: string;
  }>;
}
```

**Implementation**:
```typescript
// apps/api/src/routes/admin.ts
app.get('/api/admin/search', requireAdminAuth, async (req, res) => {
  const { q } = req.query;
  const adminUser = req.user;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query required' });
  }
  
  const isSuperAdmin = adminUser.role === 'superadmin';
  
  // Search viewers by email
  const viewersByEmail = await viewerIdentityRepository.searchByEmail(q);
  
  // Search viewers by phone
  const viewersByPhone = await viewerIdentityRepository.searchByPhone(q);
  
  // Search games by keyword
  const gamesByKeyword = await gameRepository.searchByKeyword(q);
  
  // Combine and format results
  const viewers = [...viewersByEmail, ...viewersByPhone]
    .map(v => ({
      id: v.id,
      email: isSuperAdmin ? v.email : undefined,
      emailMasked: isSuperAdmin ? undefined : maskEmail(v.email),
      phoneE164: v.phoneE164,
      purchaseCount: 0, // Calculate from purchases
    }));
  
  const games = gamesByKeyword.map(g => ({
    id: g.id,
    title: g.title,
    keywordCode: g.keywordCode,
    ownerAccountName: g.ownerAccount.name,
  }));
  
  res.json({ viewers, games });
});
```

## Purchase Timeline

### Purchase Detail Endpoint

**Endpoint**: `GET /api/admin/purchases/:purchaseId`

**Response**:
```typescript
interface PurchaseTimeline {
  purchase: {
    id: string;
    gameId: string;
    gameTitle: string;
    viewerId: string;
    viewerEmail: string; // Full for SuperAdmin, masked for SupportAdmin
    amountCents: number;
    status: string;
    createdAt: Date;
    paidAt?: Date;
  };
  timeline: Array<{
    event: string;
    timestamp: Date;
    details?: any;
  }>;
  refunds: Array<{
    id: string;
    amountCents: number;
    reasonCode: string;
    issuedBy: string;
    createdAt: Date;
  }>;
  sessions: Array<{
    id: string;
    startedAt: Date;
    endedAt?: Date;
    totalWatchMs: number;
    bufferRatio: number;
  }>;
}
```

**Implementation**:
```typescript
app.get('/api/admin/purchases/:purchaseId', requireAdminAuth, async (req, res) => {
  const { purchaseId } = req.params;
  const adminUser = req.user;
  
  const purchase = await purchaseRepository.getById(purchaseId);
  const viewer = await viewerIdentityRepository.getById(purchase.viewerId);
  const game = await gameRepository.getById(purchase.gameId);
  
  const isSuperAdmin = adminUser.role === 'superadmin';
  
  // Build timeline
  const timeline = [
    { event: 'purchase_created', timestamp: purchase.createdAt },
    ...(purchase.paidAt ? [{ event: 'purchase_paid', timestamp: purchase.paidAt }] : []),
    ...(purchase.failedAt ? [{ event: 'purchase_failed', timestamp: purchase.failedAt }] : []),
  ];
  
  // Get refunds
  const refunds = await refundRepository.findByPurchaseId(purchaseId);
  timeline.push(...refunds.map(r => ({ event: 'refund_issued', timestamp: r.createdAt })));
  
  // Get sessions
  const entitlement = await entitlementRepository.findByPurchaseId(purchaseId);
  const sessions = await playbackSessionRepository.findByEntitlementId(entitlement.id);
  
  res.json({
    purchase: {
      id: purchase.id,
      gameId: purchase.gameId,
      gameTitle: game.title,
      viewerId: purchase.viewerId,
      viewerEmail: isSuperAdmin ? viewer.email : maskEmail(viewer.email),
      amountCents: purchase.amountCents,
      status: purchase.status,
      createdAt: purchase.createdAt,
      paidAt: purchase.paidAt,
    },
    timeline: timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    refunds,
    sessions: sessions.map(s => ({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      totalWatchMs: s.totalWatchMs,
      bufferRatio: s.totalWatchMs > 0 ? s.totalBufferMs / s.totalWatchMs : 0,
    })),
  });
});
```

## Audience Drill-Down (SuperAdmin)

### Admin Audience Endpoint

**Endpoint**: `GET /api/admin/owners/:ownerId/games/:gameId/audience`

**Response**: Same as owner audience, but **full emails** for SuperAdmin

**Implementation**:
```typescript
app.get('/api/admin/owners/:ownerId/games/:gameId/audience', requireAdminAuth, async (req, res) => {
  const { ownerId, gameId } = req.params;
  const adminUser = req.user;
  
  const isSuperAdmin = adminUser.role === 'superadmin';
  
  // Get audience (same as owner endpoint, but maskEmails = !isSuperAdmin)
  const audience = await audienceService.getGameAudience(
    gameId,
    ownerId,
    !isSuperAdmin // Mask emails unless SuperAdmin
  );
  
  res.json(audience);
});
```

## Audit Logging

### Audit Log Middleware

**Middleware**: Logs all admin actions

**Implementation**:
```typescript
// apps/api/src/middleware/audit.ts
export function auditLogMiddleware(actionType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const adminUser = req.user;
    
    // Log after response
    res.on('finish', async () => {
      await auditLogRepository.create({
        adminUserId: adminUser.id,
        actionType,
        targetType: req.params.targetType || 'unknown',
        targetId: req.params.id,
        reason: req.body.reason,
        requestMetadata: {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          // Redact sensitive data
          body: redactSensitiveData(req.body),
        },
      });
    });
    
    next();
  };
}
```

### Audit Log Actions

**Tracked Actions**:
- `refund_create` (manual refunds)
- `resend_sms` (resend payment link)
- `keyword_disable` (disable keyword)
- `owner_suspend` (suspend owner account)
- `view_audience` (view game audience)
- `view_viewer_identity` (view full email)
- `config_update` (update system config)

### Audit Log View

**Endpoint**: `GET /api/admin/audit-logs`

**Query Params**:
- `adminUserId`: Filter by admin
- `actionType`: Filter by action
- `targetType`: Filter by target
- `startDate`, `endDate`: Date range

**Implementation**:
```typescript
app.get('/api/admin/audit-logs', requireAdminAuth, async (req, res) => {
  const { adminUserId, actionType, targetType, startDate, endDate } = req.query;
  
  const logs = await auditLogRepository.find({
    adminUserId: adminUserId as string,
    actionType: actionType as string,
    targetType: targetType as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  });
  
  res.json({ logs });
});
```

## Frontend Implementation

### Admin Console Page

**Route**: `/admin/console`

**Components**:
- Global search bar
- Search results table
- Purchase detail modal
- Audience drill-down

**Implementation**:
```typescript
// apps/web/app/(admin)/console/page.tsx
export default function AdminConsolePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  
  const handleSearch = async () => {
    const data = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`);
    setResults(await data.json());
  };
  
  return (
    <div>
      <h1>Admin Console</h1>
      
      <SearchBar value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} />
      
      {results && (
        <div>
          <h2>Viewers</h2>
          <Table>
            {/* Viewer results */}
          </Table>
          
          <h2>Games</h2>
          <Table>
            {/* Game results */}
          </Table>
        </div>
      )}
    </div>
  );
}
```

## Acceptance Criteria

- [ ] Admin login requires MFA (if enabled)
- [ ] MFA setup flow works (QR code, verification)
- [ ] Global search finds by email, phone, keyword
- [ ] Purchase timeline shows all events
- [ ] SuperAdmin sees full emails in audience
- [ ] SupportAdmin sees masked emails
- [ ] All admin actions logged to audit log
- [ ] Audit log view/search works
- [ ] 100% test coverage

## Next Steps

- Proceed to [13-testing-strategy-e2e.md](./13-testing-strategy-e2e.md) for testing strategy
