# Super Admin Direct Streams Implementation Status

**Started**: January 10, 2026  
**Role**: Software Engineer (implementing Architect's recommendations)

## ✅ Phase 0: Schema & Migration (COMPLETED)

### Database Changes Applied
- [x] Added `ViewerIdentity.emailVerifiedAt` field
- [x] Added `ViewerIdentity.emailVerifiedAt` index
- [x] Added `DirectStream.allowAnonymousView` (default: true)
- [x] Added `DirectStream.requireEmailVerification` (default: true)
- [x] Added `DirectStream.listed` (default: true)
- [x] Created `DirectStreamRegistration` table
- [x] Created `EmailVerificationToken` table
- [x] Applied migration: `20260110010000_add_superadmin_direct_stream_features`
- [x] Generated Prisma Client with new types

### Migration File
```sql
-- Location: packages/data-model/prisma/migrations/20260110010000_add_superadmin_direct_stream_features/migration.sql
-- Tables: DirectStreamRegistration, EmailVerificationToken
-- Fields: ViewerIdentity.emailVerifiedAt, DirectStream access control fields
```

---

## 🚧 Phase 1: Backend Services (IN PROGRESS)

### Phase 1.1: Repositories (ISP: Read/Write segregation)

#### To Create:
1. **IDirectStreamRegistrationRepository**
   - [ ] Interface: `apps/api/src/repositories/IDirectStreamRegistrationRepository.ts`
   - [ ] Implementation: `apps/api/src/repositories/implementations/DirectStreamRegistrationRepository.ts`
   - Methods: findByStreamAndViewer, findByStream, countByStream, findVerifiedByStream, create, updateVerifiedAt, updateLastSeenAt

2. **IEmailVerificationRepository**
   - [ ] Interface: `apps/api/src/repositories/IEmailVerificationRepository.ts`
   - [ ] Implementation: `apps/api/src/repositories/implementations/EmailVerificationRepository.ts`
   - Methods: findValidToken, findActiveTokensForViewer, createToken, markTokenUsed, invalidateTokens

3. **IViewerIdentityRepository** (update existing)
   - [ ] Add: `markEmailVerified(id: string): Promise<ViewerIdentity>`
   - [ ] Add: `findByEmailVerified(email: string): Promise<ViewerIdentity | null>`

### Phase 1.2: Services (TDD - Test First!)

#### Services to Implement:
1. **RegistrationService**
   - [ ] Test file: `apps/api/__tests__/unit/services/RegistrationService.test.ts` (8 tests)
   - [ ] Interface: `apps/api/src/services/IRegistrationService.ts`
   - [ ] Implementation: `apps/api/src/services/RegistrationService.ts`

2. **EmailVerificationService**
   - [ ] Test file: `apps/api/__tests__/unit/services/EmailVerificationService.test.ts` (7 tests)
   - [ ] Interface: `apps/api/src/services/IEmailVerificationService.ts`
   - [ ] Implementation: `apps/api/src/services/EmailVerificationService.ts`

3. **ViewerAccessService**
   - [ ] Test file: `apps/api/__tests__/unit/services/ViewerAccessService.test.ts` (6 tests)
   - [ ] Interface: `apps/api/src/services/IViewerAccessService.ts`
   - [ ] Implementation: `apps/api/src/services/ViewerAccessService.ts`

### Phase 1.3: API Routes (Integration Tests)

#### Public Routes (Viewer-facing):
1. **POST /api/public/direct/:slug/register**
   - [ ] Test file: `apps/api/__tests__/integration/public.direct-registration.test.ts`
   - [ ] Zod schema: `packages/data-model/src/schemas/directStreamRegistration.ts`
   - [ ] Route: `apps/api/src/routes/public.direct-registration.ts`

2. **GET /api/public/direct/verify?token=...**
   - [ ] Tests in same file as above
   - [ ] Route implementation

3. **POST /api/public/direct/:slug/resend-verification**
   - [ ] Tests in same file
   - [ ] Route implementation

4. **GET /api/public/direct/:slug/bootstrap** (update existing)
   - [ ] Update tests: `apps/api/__tests__/integration/public.direct-bootstrap.test.ts`
   - [ ] Update route with access gating logic

#### Super Admin Routes:
1. **GET /api/admin/direct-streams**
   - [ ] Test file: `apps/api/__tests__/integration/admin.direct-streams.test.ts`
   - [ ] Route: `apps/api/src/routes/admin.direct-streams.ts`

2. **POST /api/admin/direct-streams**
   - [ ] Tests in same file
   - [ ] Zod schema: `packages/data-model/src/schemas/directStreamAdmin.ts`

3. **PATCH /api/admin/direct-streams/:id**
   - [ ] Tests in same file
   - [ ] Route implementation

4. **GET /api/admin/direct-streams/:id/registrations**
   - [ ] Tests in same file
   - [ ] Route implementation

5. **POST /api/admin/direct-streams/:slug/impersonate**
   - [ ] Tests in same file
   - [ ] Route implementation

### Phase 1.4: Email Templates
- [ ] Create: `apps/api/src/lib/email-templates.ts`
- [ ] `renderVerificationEmail(viewerName, streamTitle, verifyLink)`
- [ ] Test email rendering

---

## 📋 Phase 2: Frontend UI

### Phase 2.1: Super Admin Console (`/superadmin/direct-streams`)
- [ ] Page: `apps/web/app/superadmin/direct-streams/page.tsx`
- [ ] Auth guard (SuperAdmin JWT)
- [ ] Install TanStack Table: `pnpm add @tanstack/react-table --filter web`
- [ ] Implement sorting (soonest upcoming first)
- [ ] All automation test IDs (`data-testid`)

### Phase 2.2: Create/Edit Stream Drawer
- [ ] Component: `apps/web/components/DirectStreamDrawer.tsx`
- [ ] Form validation (Zod)
- [ ] All test IDs

### Phase 2.3: View Registrations Modal
- [ ] Component: `apps/web/components/StreamRegistrationsModal.tsx`
- [ ] Table with viewer data

### Phase 2.4: Viewer Registration Flow
- [ ] Update: `apps/web/components/DirectStreamPageBase.tsx`
- [ ] Registration form
- [ ] Verification landing page: `apps/web/app/verify/page.tsx`

---

## 🧪 Phase 3: E2E Testing (8 Scenarios)

Test file: `apps/web/tests/e2e/superadmin-direct-streams.spec.ts`

- [ ] Scenario 1: Super Admin creates direct stream
- [ ] Scenario 2: Viewer registers for stream
- [ ] Scenario 3: Super Admin views registrations
- [ ] Scenario 4: Expired verification link auto-resend
- [ ] Scenario 5: Anonymous view + chat gating
- [ ] Scenario 6: Paywall requires verification
- [ ] Scenario 7: Super Admin impersonates stream admin
- [ ] Scenario 8: Table sorting (soonest upcoming first)

---

## ✅ Phase 4: Verification & Deployment

- [ ] Run `pnpm --filter api test:unit` (≥80% coverage)
- [ ] Run `pnpm --filter api test:live` (all passing)
- [ ] Run `pnpm --filter web test:e2e` (8 scenarios passing)
- [ ] Run `./scripts/preflight-build.sh` (PASS)
- [ ] Local Docker smoke test
- [ ] Update Railway environment variables
- [ ] Deploy to Railway
- [ ] Production smoke test

---

## 📝 Notes

### Defaults Confirmed:
- `allowAnonymousView = true` (new streams)
- Sort by **soonest upcoming first** for pending streams

### Key Decisions:
- Registration == verified email for stream access + chat
- Anonymous viewers can load page but cannot chat unless registered+verified
- Paywall always requires verified email
- Expired verification links auto-resend new link

### Architecture Patterns:
- **ISP**: Read/Write repository segregation
- **TDD**: Write tests before implementation
- **Automation-friendly**: All UI has `data-testid` attributes
- **Audit logging**: All Super Admin actions logged

---

## Next Steps

1. Continue with Phase 1.1: Create repository interfaces and implementations
2. Move to Phase 1.2: Implement services with TDD (test first!)
3. Complete Phase 1.3: API routes with integration tests
4. Build Phase 2: Frontend UI components
5. Create Phase 3: Playwright E2E tests
6. Execute Phase 4: Verification and deployment

---

**Current Status**: Phase 0 complete, Phase 1.1 in progress
**Token Usage**: ~147K/200K

