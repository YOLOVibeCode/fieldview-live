# DirectStream Data Lifecycle & Cascade Architecture

## Problem Statement
- **Data Isolation**: Each DirectStream instance should have its own isolated data
- **No Data Bleed**: Event A's scoreboard/settings should never appear on Event B
- **Chat Preservation**: Chat history must be preserved even after stream ends
- **Clean Deletion**: When a stream is deleted, transient data should cascade delete

---

## Current Schema Issues

### ❌ **Issue 1: Optional Game Relationship**
```prisma
model DirectStream {
  gameId  String?  @unique @db.Uuid
  game    Game?    @relation(fields: [gameId], references: [id])
  // ❌ No onDelete specified - orphans possible
}
```

**Impact**: If Game is deleted, DirectStream loses chat linkage but doesn't know it.

### ❌ **Issue 2: Chat Messages Tied Only to Game**
```prisma
model GameChatMessage {
  gameId   String  @db.Uuid
  game     Game    @relation(fields: [gameId], references: [id], onDelete: Cascade)
  // ❌ If Game is deleted, ALL CHAT is deleted!
}
```

**Impact**: Violates "chat logs should continue to exist" requirement.

### ✅ **Issue 3: Scoreboard Cascade (Already Correct)**
```prisma
model GameScoreboard {
  directStreamId  String       @db.Uuid @unique
  directStream    DirectStream @relation(fields: [directStreamId], references: [id], onDelete: Cascade)
  // ✅ Correctly cascades when DirectStream is deleted
}
```

**Impact**: Scoreboard is properly scoped to DirectStream instance.

---

## Solution Architecture

### Option A: **Soft Delete with Archival** (RECOMMENDED)
Preserve all data but mark streams as archived.

```prisma
model DirectStream {
  // ... existing fields ...
  
  status        String    @default("active") // 'active' | 'archived' | 'deleted'
  archivedAt    DateTime?
  deletedAt     DateTime?
  
  // CHANGE: Make Game relationship with SetNull
  gameId        String?   @unique @db.Uuid
  game          Game?     @relation(fields: [gameId], references: [id], onDelete: SetNull)
}

model GameChatMessage {
  // ... existing fields ...
  
  // ADD: Direct reference to DirectStream for preservation
  directStreamId String? @db.Uuid
  directStream   DirectStream? @relation(fields: [directStreamId], references: [id], onDelete: SetNull)
}
```

**Benefits**:
- ✅ Chat preserved forever (SetNull on delete)
- ✅ Admin can "archive" old streams without data loss
- ✅ Scoreboard still cascades (transient data)
- ✅ Can query "active" vs "archived" streams

**Drawbacks**:
- Need periodic cleanup job for truly deleted streams
- Database grows over time

---

### Option B: **Hard Delete with Chat Preservation**
Delete streams but preserve chat in separate archive table.

```prisma
model DirectStream {
  // ... existing fields ...
  
  // CHANGE: Cascade delete Game (transient)
  gameId        String?   @unique @db.Uuid
  game          Game?     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  
  chatArchives  ArchivedChatMessage[]
}

model GameChatMessage {
  // Existing - will cascade delete with Game
}

model ArchivedChatMessage {
  id               String    @id @default(uuid()) @db.Uuid
  directStreamId   String    @db.Uuid
  originalGameId   String    @db.Uuid
  viewerId         String    @db.Uuid
  displayName      String
  message          String
  originalCreatedAt DateTime
  archivedAt       DateTime  @default(now())
  
  directStream     DirectStream   @relation(fields: [directStreamId], references: [id], onDelete: Cascade)
  viewer           ViewerIdentity @relation(fields: [viewerId], references: [id])
  
  @@index([directStreamId])
  @@index([originalGameId])
}
```

**Benefits**:
- ✅ Clean deletion of transient data
- ✅ Chat preserved in separate table
- ✅ Can distinguish "active" vs "archived" chat

**Drawbacks**:
- Need migration job to move chat on deletion
- More complex deletion logic

---

### Option C: **Cascade Everything but Archive on Request**
Simple cascade, but add explicit "archive" action before delete.

```prisma
model DirectStream {
  // ... existing fields ...
  
  // CHANGE: Full cascade delete
  gameId        String?   @unique @db.Uuid
  game          Game?     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  
  // Scoreboard already cascades ✅
}

// Before deleting, call archive API:
// POST /api/direct/:slug/archive
// - Copies chat to ArchivedChatMessage
// - Copies scoreboard final state to ArchivedScoreboard
// - Marks stream as archived
// - THEN allows deletion
```

**Benefits**:
- ✅ Clean data model
- ✅ Explicit admin action to preserve data
- ✅ No orphaned data

**Drawbacks**:
- Admin must remember to archive before delete
- Risk of accidental data loss

---

## Recommended Implementation: **Option A (Soft Delete)**

### Migration Steps

#### 1. Add Status Fields to DirectStream
```sql
ALTER TABLE "DirectStream" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "DirectStream" ADD COLUMN "archivedAt" TIMESTAMP;
ALTER TABLE "DirectStream" ADD COLUMN "deletedAt" TIMESTAMP;

-- Add check constraint
ALTER TABLE "DirectStream" ADD CONSTRAINT "DirectStream_status_check" 
  CHECK ("status" IN ('active', 'archived', 'deleted'));
```

#### 2. Update Game Relationship
```sql
-- Drop existing foreign key
ALTER TABLE "DirectStream" DROP CONSTRAINT IF EXISTS "DirectStream_gameId_fkey";

-- Re-add with SetNull
ALTER TABLE "DirectStream" ADD CONSTRAINT "DirectStream_gameId_fkey" 
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

#### 3. Add DirectStream Reference to Chat (Optional)
```sql
ALTER TABLE "GameChatMessage" ADD COLUMN "directStreamId" UUID;

-- Backfill existing chat messages
UPDATE "GameChatMessage" gcm
SET "directStreamId" = ds."id"
FROM "DirectStream" ds
WHERE gcm."gameId" = ds."gameId" AND ds."gameId" IS NOT NULL;

-- Add foreign key with SetNull
ALTER TABLE "GameChatMessage" ADD CONSTRAINT "GameChatMessage_directStreamId_fkey"
  FOREIGN KEY ("directStreamId") REFERENCES "DirectStream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "GameChatMessage_directStreamId_idx" ON "GameChatMessage"("directStreamId");
```

---

## API Changes

### Archive Endpoint
```typescript
POST /api/direct/:slug/archive
Authorization: Bearer <admin-jwt>

Response:
{
  "success": true,
  "archivedAt": "2026-01-09T10:00:00Z",
  "preservedChatMessages": 142,
  "finalScore": { "home": 3, "away": 2 }
}
```

### Delete Endpoint
```typescript
DELETE /api/direct/:slug
Authorization: Bearer <admin-jwt>

// Soft delete: Set status = 'deleted', deletedAt = now()
// Hard delete: Only allowed if status = 'archived' first
```

### Query Active Streams
```typescript
GET /api/direct?status=active

// Default filter: WHERE status = 'active'
// Admin can query: ?status=archived or ?status=deleted
```

---

## Data Retention Policy

| Data Type | Retention | Cascade Behavior |
|-----------|-----------|------------------|
| **DirectStream** | Soft delete (archived) | N/A |
| **GameScoreboard** | Deleted when stream deleted | Cascade |
| **GameChatMessage** | **PRESERVED** forever | SetNull |
| **Game** | Deleted when stream deleted | SetNull (DirectStream orphans gracefully) |
| **Purchase** | **PRESERVED** forever | SetNull |
| **ViewerIdentity** | **PRESERVED** forever | No cascade |

---

## Isolation Strategy

### Per-Instance Isolation
- Each DirectStream has a unique `slug` (primary isolation key)
- GameScoreboard has `directStreamId @unique` (1:1 relationship)
- Game linkage is optional but scoped (1:1 via `@unique`)
- Chat messages reference both `gameId` AND `directStreamId` for double isolation

### No Data Bleed Guarantee
```typescript
// ❌ BEFORE: Scoreboard could bleed if slug reused
const scoreboard = await prisma.gameScoreboard.findFirst({
  where: { /* no proper scoping */ }
});

// ✅ AFTER: Scoreboard scoped to DirectStream
const scoreboard = await prisma.gameScoreboard.findUnique({
  where: { directStreamId: stream.id }
});
```

---

## Migration Plan

### Phase 1: Add Soft Delete (Non-Breaking)
- [x] Add `status`, `archivedAt`, `deletedAt` to DirectStream
- [x] Update bootstrap to filter `status = 'active'`
- [x] Add archive API endpoint

### Phase 2: Fix Cascade Relationships
- [ ] Update DirectStream → Game to `onDelete: SetNull`
- [ ] Add `directStreamId` to GameChatMessage
- [ ] Backfill existing chat messages

### Phase 3: Hard Delete Support
- [ ] Add `DELETE /api/direct/:slug` endpoint
- [ ] Require archive before hard delete
- [ ] Add cleanup job for old deleted streams

---

## Testing Checklist

- [ ] Create DirectStream A with scoreboard and chat
- [ ] Create DirectStream B with different scoreboard and chat
- [ ] Verify scoreboard A does NOT show on stream B
- [ ] Verify chat A does NOT show on stream B
- [ ] Archive stream A
- [ ] Verify chat A is still readable
- [ ] Verify scoreboard A is deleted
- [ ] Hard delete stream A
- [ ] Verify chat A is still preserved
- [ ] Verify no orphaned data in database

---

## Questions for User

1. **Retention Policy**: How long should archived streams be kept?
   - Forever? 
   - 1 year? 
   - Admin-controlled purge?

2. **Archive Trigger**: When should streams be archived?
   - Manual admin action?
   - Auto-archive 7 days after last activity?
   - Auto-archive after `scheduledStartAt` + 48 hours?

3. **Hard Delete**: Should we support true hard delete or always soft delete?

4. **Chat Display**: Should archived streams show chat in read-only mode?

---

**Next Step**: Choose Option A, B, or C and implement the migration.

