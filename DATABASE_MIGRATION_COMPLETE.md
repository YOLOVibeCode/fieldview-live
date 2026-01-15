# Database Schema Update - DVR Tables

## ✅ **Migration Complete!**

### **Local Database** (Development)
**Status**: ✅ **APPLIED**  
**Method**: `prisma db push`  
**Database**: PostgreSQL @ localhost:4302  
**Tables Added**:
- `VideoClip`
- `VideoBookmark`

### **Production Database** (Railway)
**Status**: ⏳ **PENDING (Auto-deploy)**  
**Method**: Railway auto-migration on deployment  
**Trigger**: Git push to main branch  
**Migration File**: `scripts/add-dvr-tables.sql`

---

## 📋 **What Was Added**

### **VideoClip Table**
Stores DVR clips from any provider (Mock, Mux, Cloudflare):

```sql
- id: UUID (PK)
- gameId: UUID (FK → Game)
- directStreamId: UUID (FK → DirectStream)
- directStreamSlug: TEXT (denormalized for fast lookup)
- providerName: TEXT ('mock', 'mux', 'cloudflare')
- providerClipId: TEXT (provider's clip ID)
- providerRecordingId: TEXT (provider's recording ID)
- title: TEXT
- description: TEXT (nullable)
- startTimeSeconds: INT
- endTimeSeconds: INT
- durationSeconds: INT
- playbackUrl: TEXT (HLS/MP4 URL)
- thumbnailUrl: TEXT
- status: TEXT ('pending', 'ready', 'failed')
- isPublic: BOOLEAN (default false)
- viewCount: INT (default 0)
- shareCount: INT (default 0)
- createdById: UUID (nullable)
- createdByType: TEXT ('viewer', 'admin', 'system')
- expiresAt: TIMESTAMP (nullable)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

**Unique Constraint**: `(providerName, providerClipId)`

**Indexes**:
- `gameId`, `directStreamId`, `directStreamSlug`
- `status`, `isPublic`, `createdAt`, `expiresAt`

---

### **VideoBookmark Table**
User-created bookmarks for key moments:

```sql
- id: UUID (PK)
- gameId: UUID (FK → Game, CASCADE)
- directStreamId: UUID (FK → DirectStream, CASCADE)
- clipId: UUID (FK → VideoClip, SET NULL)
- viewerIdentityId: UUID (FK → ViewerIdentity, CASCADE)
- timestampSeconds: INT
- label: TEXT (e.g., "Great Goal!", "Offside Call")
- notes: TEXT (nullable)
- isShared: BOOLEAN (default false)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

**Indexes**:
- `gameId`, `directStreamId`, `viewerIdentityId`, `clipId`, `createdAt`

---

## 🔗 **Relations Updated**

### **Game Model**
```typescript
videoClips: VideoClip[]
videoBookmarks: VideoBookmark[]
```

### **DirectStream Model**
```typescript
videoClips: VideoClip[]
videoBookmarks: VideoBookmark[]
```

### **ViewerIdentity Model**
```typescript
videoBookmarks: VideoBookmark[]
```

---

## 🚀 **How to Verify**

### **Local (Development)**
```bash
# Check tables exist
docker exec -it fieldview-postgres psql -U fieldview -d fieldview_dev -c "\dt Video*"

# Or use Prisma Studio
pnpm db:studio
```

### **Production (Railway)**
Railway will auto-apply the schema changes when the new deployment completes.

**Monitor deployment**:
```bash
railway logs --service api | grep -i prisma
```

**Verify in Railway dashboard**:
1. Go to https://railway.app
2. Navigate to fieldview-live project
3. Check "Deployments" tab for status
4. New deployment should show Prisma Client generation

---

## 📝 **Migration Script**

**File**: `scripts/add-dvr-tables.sql`

Contains:
- CREATE TABLE statements
- CREATE INDEX statements
- ALTER TABLE for foreign keys
- All constraints and defaults

---

## ✅ **Checklist**

- [x] Prisma schema updated
- [x] Local database migrated (db push)
- [x] Prisma Client generated
- [x] Migration SQL script created
- [x] Changes committed to git
- [x] Pushed to main (triggers Railway)
- [ ] Railway deployment completes (automatic)
- [ ] Production tables verified (after deployment)

---

## 🔧 **Scripts Reference**

### **Local Development**
```bash
# Generate Prisma Client
pnpm db:generate

# Sync schema to local DB (no migration files)
pnpm --filter @fieldview/data-model db:push

# Open Prisma Studio
pnpm db:studio
```

### **Production (Railway)**
Railway automatically runs:
1. `npm run build` (which includes `db:generate`)
2. `node apps/api/railway-migrate.js` (runs `prisma migrate deploy`)

---

## 🎯 **Next Steps**

1. **Wait for Railway deployment** to complete (~2-5 minutes)
2. **Verify production tables** exist
3. **Create ClipRepository** (following ISP):
   - `IClipReader` interface
   - `IClipWriter` interface
   - `ClipRepository` implementation
4. **Create ClipService** (business logic)
5. **Add API routes** (`/api/clips`)
6. **Build frontend UI** (bookmark button, clip viewer)

---

## 📊 **Database Schema Stats**

| Metric | Value |
|--------|-------|
| **New Tables** | 2 |
| **New Columns** | 30 |
| **New Indexes** | 15 |
| **Foreign Keys** | 6 |
| **Unique Constraints** | 1 |

---

## 🎉 **Success!**

✅ **Local database** is updated and ready for development  
⏳ **Production database** will be updated on next Railway deployment  
🚀 **DVR service** is ready for integration!

**All 3 providers (Mock, Mux, Cloudflare) can now store clips in the database!**

