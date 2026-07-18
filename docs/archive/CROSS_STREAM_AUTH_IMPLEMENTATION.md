# Cross-Stream Viewer Authentication Implementation

## Problem Statement

Currently, viewers must register separately for each direct stream. If they log in to `/direct/tchs`, they must log in again for `/direct/stormfc`. This creates a poor UX, especially on mobile.

## Solution: Global Viewer Authentication

### User Flow

```
User registers on Stream A (tchs)
    ↓
Credentials saved to localStorage
    ↓
User navigates to Stream B (stormfc)
    ↓
System detects existing credentials
    ↓
If Stream B has no paywall:
    → Auto-register user for Stream B
    → Enable chat/scoreboard immediately
    ↓
If Stream B has paywall:
    → Show paywall
    → After payment, use existing credentials
```

## Implementation Checklist

### Phase 1: Global Viewer Auth Hook ✅
- [ ] Create `useGlobalViewerAuth` hook
- [ ] Store/load from localStorage: `fieldview_viewer_identity`
- [ ] Provide: `viewerEmail`, `viewerName`, `viewerIdentityId`, `isAuthenticated`
- [ ] Methods: `setViewerAuth()`, `clearViewerAuth()`
- [ ] Cross-tab sync using storage events

### Phase 2: Auto-Registration Service
- [ ] Create `autoRegisterViewer()` function
- [ ] Check if user is already registered for this stream
- [ ] If not, register them using existing credentials
- [ ] Return registration token for chat/scoreboard

### Phase 3: DirectStreamPageBase Integration
- [ ] Import `useGlobalViewerAuth`
- [ ] Check on mount if user is globally authenticated
- [ ] If authenticated + no paywall:
  - Call `autoRegisterViewer(streamSlug, viewerIdentityId)`
  - Enable chat/scoreboard
- [ ] If authenticated + paywall:
  - Show paywall
  - Pre-fill email/name if available

### Phase 4: Demo Page Integration
- [ ] Connect to real API endpoints
- [ ] Use `useGlobalViewerAuth`
- [ ] Test cross-stream navigation
- [ ] Test mobile flow

### Phase 5: E2E Testing
- [ ] Test: Register on Stream A → Navigate to Stream B → Auto-logged in
- [ ] Test: Clear localStorage → Must register again
- [ ] Test: Cross-tab sync
- [ ] Test: Mobile device flow

## Database Schema (Already Exists)

```prisma
model ViewerIdentity {
  id                         String   @id @default(cuid())
  email                      String
  firstName                  String?
  lastName                   String?
  createdAt                  DateTime @default(now())
  
  registrations              DirectStreamRegistration[]
}

model DirectStreamRegistration {
  id                         String   @id @default(cuid())
  directStreamId             String
  viewerIdentityId           String
  registeredAt               DateTime @default(now())
  accessToken                String?
  
  directStream               DirectStream     @relation(...)
  viewerIdentity             ViewerIdentity   @relation(...)
  
  @@unique([directStreamId, viewerIdentityId])
}
```

## API Endpoints (Already Exist)

- `POST /api/public/direct-viewer/register` - Register new viewer
- `GET /api/public/direct-viewer/:id` - Get viewer info
- `POST /api/public/direct-viewer/auto-register` - **NEW** Auto-register existing viewer

## Storage Schema

```typescript
interface GlobalViewerIdentity {
  viewerIdentityId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  registeredAt: string; // ISO date
}

// Stored in localStorage as:
// fieldview_viewer_identity: JSON.stringify(GlobalViewerIdentity)
```

## Benefits

1. **Seamless UX**: Register once, use everywhere
2. **Mobile-Friendly**: No repeated forms on small screens
3. **Persistent**: Survives page reloads and navigation
4. **Privacy-Aware**: Only email + name, no sensitive data
5. **Paywall-Compatible**: Still enforces payment walls
6. **Cross-Tab**: Works across multiple tabs/windows

## Edge Cases

1. **User clears localStorage**: Must register again (expected)
2. **User changes email**: Must register with new email
3. **Expired registration**: Re-register automatically
4. **Different device**: Must register on new device (expected)
5. **Paywall + existing auth**: Show paywall, pre-fill form

## Testing Scenarios

### Scenario 1: Happy Path
1. User visits `/direct/tchs`
2. Registers with email
3. Chats and updates scoreboard
4. Navigates to `/direct/stormfc` (no paywall)
5. ✅ **Automatically logged in, can chat/update scoreboard**

### Scenario 2: Paywall
1. User visits `/direct/tchs` (no paywall)
2. Registers with email
3. Navigates to `/direct/premium-stream` (has paywall)
4. ✅ **Sees paywall, email pre-filled**
5. Pays and gains access
6. ✅ **Can chat/update scoreboard immediately**

### Scenario 3: Mobile
1. User on mobile visits `/direct/tchs`
2. Registers with email (compact form)
3. Navigates to `/direct/stormfc`
4. ✅ **No login prompt, immediately active**

### Scenario 4: Multi-Tab
1. User has Tab A on `/direct/tchs` (not logged in)
2. User opens Tab B on `/direct/stormfc`
3. User registers in Tab B
4. ✅ **Tab A detects auth change and enables features**

---

## Next Steps

1. Implement `useGlobalViewerAuth` hook
2. Create auto-registration API endpoint
3. Integrate into `DirectStreamPageBase`
4. Test across multiple streams
5. Deploy and verify in production


