# Architecture Analysis: Stream Data Flow

**Role: Architect**  
**Date: January 22, 2026**  
**Status: Analysis Only - No Implementation**

---

## Executive Summary

This document analyzes the complete data flow for Direct Streams from database to UI rendering, with specific focus on environment separation between **local** and **production**.

---

## 1. Environment Architecture

### 1.1 Environment Separation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL ENVIRONMENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Web (localhost:4300)  ──────────▶  API (localhost:4301)                   │
│           │                                  │                               │
│           │                                  │                               │
│           │                                  ▼                               │
│           │                         DATABASE (localhost:4302)                │
│           │                         fieldview_dev                            │
│           │                                                                  │
│           └── NEXT_PUBLIC_API_URL = http://localhost:4301                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ENVIRONMENT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Web (fieldview.live)  ──────────▶  API (api.fieldview.live)               │
│           │                                  │                               │
│           │                                  │                               │
│           │                                  ▼                               │
│           │                         RAILWAY DATABASE                         │
│           │                         (PostgreSQL on Railway)                  │
│           │                                                                  │
│           └── NEXT_PUBLIC_API_URL = https://api.fieldview.live              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Environment Variables

| Variable | Local | Production | Purpose |
|----------|-------|------------|---------|
| `DATABASE_URL` | `localhost:4302/fieldview_dev` | Railway PostgreSQL | Database connection |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4301` | `https://api.fieldview.live` | API endpoint for frontend |
| `JWT_SECRET` | Local secret | Railway secret | Admin token signing |
| `REDIS_URL` | `localhost:4303` | Railway Redis | Rate limiting, sessions |

### 1.3 Critical Finding: Complete Separation

✅ **Local and Production are COMPLETELY INDEPENDENT:**
- Different databases (different data)
- Different API endpoints
- Different environment variables
- Changes to local database do NOT affect production

❌ **Current Issue:**
When you updated the stream password locally, you updated `localhost:4302/fieldview_dev`, NOT the Railway production database.

---

## 2. Complete Data Flow

### 2.1 Stream Data Flow (Read)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        STREAM DATA FLOW (READ)                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  USER BROWSER                                                              │
│       │                                                                    │
│       │ 1. Navigate to /direct/tchs/soccer-20260122-jv2                    │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  Next.js Page (apps/web/app/direct/[slug]/page.tsx)    │               │
│  │                                                         │               │
│  │  - Extracts slug from URL params                        │               │
│  │  - Renders DirectStreamPageBase component               │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 2. Component mounts, useEffect triggers                            │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  DirectStreamPageBase.tsx (Line 307-373)               │               │
│  │                                                         │               │
│  │  const API_URL = process.env.NEXT_PUBLIC_API_URL       │               │
│  │                   || 'http://localhost:4301'           │               │
│  │                                                         │               │
│  │  fetch(`${API_URL}/api/direct/${slug}/bootstrap`)      │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 3. HTTP GET to API                                                 │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  API Router (apps/api/src/routes/direct.ts Line 50-223)│               │
│  │                                                         │               │
│  │  GET /:slug/bootstrap                                   │               │
│  │  - Normalizes slug to lowercase                         │               │
│  │  - Queries database for DirectStream                    │               │
│  │  - Auto-creates if not found (with default password)    │               │
│  │  - Returns page config + stream config                  │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 4. Prisma query                                                    │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  DATABASE (DirectStream table)                          │               │
│  │                                                         │               │
│  │  SELECT * FROM "DirectStream"                           │               │
│  │  WHERE slug = 'tchs/soccer-20260122-jv2'               │               │
│  │                                                         │               │
│  │  Returns:                                               │               │
│  │  - id, slug, title                                      │               │
│  │  - streamUrl (HLS manifest URL)                         │               │
│  │  - adminPassword (bcrypt hash)                          │               │
│  │  - chatEnabled, scoreboardEnabled, paywallEnabled       │               │
│  │  - priceInCents, paywallMessage                         │               │
│  │  - etc.                                                 │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 5. Response flows back                                             │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  FRONTEND RENDERS                                       │               │
│  │                                                         │               │
│  │  - If streamUrl exists: HLS player loads video          │               │
│  │  - If no streamUrl: Shows "Stream Offline" message      │               │
│  │  - Chat panel initializes if chatEnabled                │               │
│  │  - Scoreboard shows if scoreboardEnabled                │               │
│  │  - Paywall modal shows if paywallEnabled                │               │
│  └─────────────────────────────────────────────────────────┘               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Admin Unlock Flow (Write)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        ADMIN UNLOCK FLOW                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ADMIN                                                                     │
│       │                                                                    │
│       │ 1. Clicks "Admin Panel" button                                     │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  AdminPanel.tsx (Line 79-155)                          │               │
│  │                                                         │               │
│  │  handleUnlock(e: React.FormEvent)                      │               │
│  │  - Prevents default form submission                     │               │
│  │  - Gets fullSlug = slug.toLowerCase()                  │               │
│  │  - Encodes slug for URL                                 │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 2. POST request                                                    │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  API Router (apps/api/src/routes/direct.ts Line 225-289)│               │
│  │                                                         │               │
│  │  POST /:slug/unlock-admin                               │               │
│  │  Request: { password: "user_entered_password" }         │               │
│  │                                                         │               │
│  │  Processing:                                            │               │
│  │  1. Validate request body (Zod schema)                  │               │
│  │  2. Normalize slug to lowercase                         │               │
│  │  3. Query database for DirectStream                     │               │
│  │  4. Compare password with bcrypt.compare()              │               │
│  │  5. If valid, generate JWT token                        │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 3. Database query                                                  │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  DATABASE                                               │               │
│  │                                                         │               │
│  │  SELECT adminPassword FROM "DirectStream"               │               │
│  │  WHERE slug = 'tchs/soccer-20260122-jv2'               │               │
│  │                                                         │               │
│  │  Returns: adminPassword = '$2b$10$...' (bcrypt hash)    │               │
│  │                                                         │               │
│  │  bcrypt.compare(password, adminPassword)                │               │
│  │  - If matches: return { token: "jwt..." }               │               │
│  │  - If not: return { error: "Invalid password" }         │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 4. Success: Admin Panel unlocks                                    │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  ADMIN CAN NOW:                                         │               │
│  │  - Set stream URL (HLS manifest)                        │               │
│  │  - Toggle chat/scoreboard/paywall                       │               │
│  │  - Set price and paywall message                        │               │
│  │  - Configure scoreboard teams/colors                    │               │
│  └─────────────────────────────────────────────────────────┘               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Save Stream Settings Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        SAVE STREAM SETTINGS FLOW                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ADMIN (Unlocked)                                                          │
│       │                                                                    │
│       │ 1. Enters stream URL, toggles settings, clicks "Save"              │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  AdminPanel.tsx handleSave()                           │               │
│  │                                                         │               │
│  │  const fullSlug = slug.toLowerCase();                  │               │
│  │  const url = `${apiUrl}/api/direct/${encodeURIComponent(fullSlug)}/settings`;│
│  │                                                         │               │
│  │  POST with body:                                        │               │
│  │  {                                                      │               │
│  │    streamUrl: "https://...",                            │               │
│  │    chatEnabled: true,                                   │               │
│  │    paywallEnabled: false,                               │               │
│  │    scoreboardEnabled: true,                             │               │
│  │    ...                                                  │               │
│  │  }                                                      │               │
│  │                                                         │               │
│  │  Headers: Authorization: Bearer <jwt_token>             │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 2. POST request                                                    │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  API Router (apps/api/src/routes/direct.ts Line 291+)  │               │
│  │                                                         │               │
│  │  POST /:slug/settings                                   │               │
│  │  - Validates JWT token (middleware)                     │               │
│  │  - Validates request body (Zod schema)                  │               │
│  │  - Updates database                                     │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 3. Database UPDATE                                                 │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  DATABASE                                               │               │
│  │                                                         │               │
│  │  UPDATE "DirectStream"                                  │               │
│  │  SET streamUrl = '...', chatEnabled = true, ...         │               │
│  │  WHERE slug = 'tchs/soccer-20260122-jv2'               │               │
│  └─────────────────────────────────────────────────────────┘               │
│       │                                                                    │
│       │ 4. Success response                                                │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │  UI UPDATES:                                            │               │
│  │  - Shows "Settings saved successfully"                  │               │
│  │  - Page can be refreshed                                │               │
│  │  - Bootstrap will return new streamUrl                  │               │
│  │  - Video player will initialize with stream             │               │
│  └─────────────────────────────────────────────────────────┘               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Current Issues Identified

### 3.1 Password Mismatch (Production vs Local)

**Symptom:** Unlock returns "Invalid password"

**Root Cause:**
1. You created/updated the stream in the **LOCAL** database (`localhost:4302`)
2. Production API queries the **RAILWAY** database
3. The stream might not exist in production OR has a different password

**Evidence:**
```bash
# Local database shows:
Stream found: {
  "slug": "tchs/soccer-20260122-jv2",
  "adminPassword": "$2b$10$mzSRViE7RdN5UPPyB3gAuOixaDdj8o.GWCj9vCf/GUs2rXT78x5Ei"
}

# But production returns:
{"error":"Invalid password"}
```

### 3.2 Stream Auto-Creation Behavior

**Current Behavior (API Line 99-163):**

If a DirectStream is NOT found in the database, the API **automatically creates** one with:
- Default title: `Direct Stream: ${slug}`
- Default password: `admin2026` (bcrypt hashed)
- Default settings: chatEnabled=true, paywallEnabled=false, etc.

**This means:**
- The first time you visit a new slug, a stream is auto-created
- If you don't know the default password (`admin2026`), you can't unlock
- The production database may have a stream with the default password

### 3.3 Form Submission Not Triggering

**Symptom:** Clicking "Unlock Admin Panel" doesn't make API request

**Possible Causes:**
1. Form `onSubmit` handler not binding correctly
2. JavaScript error preventing execution
3. Component re-rendering issue (many `mounted/rendered` logs)

---

## 4. Recommendations

### 4.1 Test Flow Locally First

**Before testing production, verify the complete flow works locally:**

1. Start local services:
   ```bash
   # Terminal 1: Start PostgreSQL (Docker or local)
   docker-compose up -d
   
   # Terminal 2: Start API
   cd apps/api && pnpm dev
   
   # Terminal 3: Start Web
   cd apps/web && pnpm dev
   ```

2. Test locally:
   ```bash
   # Check local API
   curl http://localhost:4301/health
   
   # Check local bootstrap
   curl http://localhost:4301/api/direct/tchs%2Fsoccer-20260122-jv2/bootstrap
   
   # Test unlock with default password
   curl -X POST http://localhost:4301/api/direct/tchs%2Fsoccer-20260122-jv2/unlock-admin \
     -H "Content-Type: application/json" \
     -d '{"password":"admin2026"}'
   ```

3. Open browser to `http://localhost:4300/direct/tchs/soccer-20260122-jv2`

### 4.2 Production Database Access

**To manage production streams, you need:**

1. **Railway Dashboard Access:**
   - View production database
   - Update stream passwords
   - Check stream records

2. **OR Create a Database Seed Script:**
   ```typescript
   // scripts/seed-production-stream.ts
   // Uses PRODUCTION_DATABASE_URL to upsert streams
   ```

3. **OR Use the Default Password:**
   - Try `admin2026` on production
   - This is the default password for auto-created streams

### 4.3 Fix Form Submission Issue

**Investigate why form submission isn't triggering:**

1. Check console for JavaScript errors
2. Verify the form has `onSubmit={handleUnlock}`
3. Check if button has `type="submit"`
4. Look for any overlay or modal blocking clicks

### 4.4 Environment Clarity

**Add documentation for environment setup:**

| Task | Local | Production |
|------|-------|------------|
| Create stream | Updates `localhost:4302` | Updates Railway DB |
| Test admin unlock | Use local password | Use production password |
| Test UI | `localhost:4300` | `fieldview.live` |
| View logs | Terminal output | Railway logs |

---

## 5. Next Steps (For Engineer)

1. **Test default password on production:**
   ```bash
   curl -X POST https://api.fieldview.live/api/direct/tchs%2Fsoccer-20260122-jv2/unlock-admin \
     -H "Content-Type: application/json" \
     -d '{"password":"admin2026"}'
   ```

2. **If default password works:**
   - Change password in admin panel
   - Save settings
   - Test full flow

3. **If default password doesn't work:**
   - Stream was created with different password
   - Need Railway database access to reset
   - OR delete and recreate stream

4. **Debug form submission:**
   - Add more console logs
   - Check for JavaScript errors
   - Verify form binding

---

## 6. Summary

| Component | Location | Database |
|-----------|----------|----------|
| **Local API** | `localhost:4301` | `localhost:4302/fieldview_dev` |
| **Local Web** | `localhost:4300` | N/A (uses API) |
| **Prod API** | `api.fieldview.live` | Railway PostgreSQL |
| **Prod Web** | `fieldview.live` | N/A (uses API) |

**Key Insight:**
- Local and Production are **completely independent**
- Changes to local database do NOT affect production
- You must update the **production database** to change production behavior
- Try the default password `admin2026` first

---

**ROLE: architect**
