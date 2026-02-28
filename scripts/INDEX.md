# Scripts Index

> 🔧 Auto-generated index of all project scripts. Last updated: 1/16/2026

## 📊 Overview

- **Total Scripts**: 61
- **Categories**: 7
- **Executable**: 40 scripts

## 📑 Table of Contents

- [⚙️ Setup & Installation](#setup-installation)
- [🔨 Build Scripts](#build-scripts)
- [🧪 Testing Scripts](#testing-scripts)
- [🚀 Deployment Scripts](#deployment-scripts)
- [🗄️ Database Scripts](#database-scripts)
- [🔄 CI/CD Scripts](#ci-cd-scripts)
- [🔧 Utility Scripts](#utility-scripts)

## ⚙️ Setup & Installation

*Scripts for project setup and dependency installation*

### [`setup-marketplace-local.sh`](setup-marketplace-local.sh)
Setup script for Marketplace Model A (local)

**Usage:**
```bash
./setup-marketplace-local.sh
```

*Language: bash • ✓ Executable*

### [`setup-stormfc-paths.ts`](setup-stormfc-paths.ts)
**Usage:**
```bash
node setup-stormfc-paths.ts
```

*Language: typescript • ✗ Not executable*

### [`setup-stormfc-via-api.sh`](setup-stormfc-via-api.sh)
Setup STORMFC Paths for stormfc@darkware.net via API

**Usage:**
```bash
./setup-stormfc-via-api.sh
```

*Language: bash • ✓ Executable*

### [`verify-setup.sh`](verify-setup.sh)
Verification script for Marketplace Model A setup

**Usage:**
```bash
./verify-setup.sh
```

*Language: bash • ✓ Executable*

### [`ensure-super-admin.sh`](ensure-super-admin.sh)
Ensure super admin (`admin@fieldview.live`) exists locally and in production via API. Prompts for password; uses local `http://localhost:4301` and production `https://api.fieldview.live`.

**Usage:**
```bash
./scripts/ensure-super-admin.sh
```

*Language: bash • ✓ Executable*

## 🔨 Build Scripts

*Scripts for building and compiling the project*

### [`debug-railway-build.sh`](debug-railway-build.sh)
##############################################################################

**Usage:**
```bash
./debug-railway-build.sh
```

*Language: bash • ✓ Executable*

### [`preflight-build.sh`](preflight-build.sh)
##############################################################################

**Usage:**
```bash
./preflight-build.sh
```

*Language: bash • ✓ Executable*

## 🧪 Testing Scripts

*Scripts for running tests and generating coverage*

### [`create-e2e-test-data.js`](create-e2e-test-data.js)
Create or find test owner

**Usage:**
```bash
node create-e2e-test-data.js
```

*Language: javascript • ✗ Not executable*

### [`create-test-streams.sh`](create-test-streams.sh)
Create Mux test streams via API (requires MUX_TOKEN_ID and MUX_TOKEN_SECRET)

**Usage:**
```bash
./create-test-streams.sh
```

*Language: bash • ✓ Executable*

### [`seed-test-stream.ts`](seed-test-stream.ts)
Load environment from .env for API service

**Usage:**
```bash
node seed-test-stream.ts
```

*Language: typescript • ✗ Not executable*

### [`test-chat-e2e.sh`](test-chat-e2e.sh)
Run E2E Chat Tests with Full Conversation Simulation

**Usage:**
```bash
./test-chat-e2e.sh
```

*Language: bash • ✓ Executable*

### [`test-direct-chat.sh`](test-direct-chat.sh)
Test Direct Stream Chat Integration

**Usage:**
```bash
./test-direct-chat.sh
```

*Language: bash • ✓ Executable*

### [`test-direct-password.ts`](test-direct-password.ts)
**Usage:**
```bash
node test-direct-password.ts
```

*Language: typescript • ✗ Not executable*

### [`test-direct-stream-ux.sh`](test-direct-stream-ux.sh)
Direct Stream UX Test Execution Script

**Usage:**
```bash
./test-direct-stream-ux.sh
```

*Language: bash • ✓ Executable*

### [`test-dvr.sh`](test-dvr.sh)
DVR Test Runner - Local & Production

**Usage:**
```bash
./test-dvr.sh [arguments]
```

*Language: bash • ✓ Executable • ⚠️ Requires arguments*

### [`test-integrations-local.sh`](test-integrations-local.sh)
Loads env vars from common local files, then tests external integrations.

**Usage:**
```bash
./test-integrations-local.sh [arguments]
```

*Language: bash • ✓ Executable • ⚠️ Requires arguments*

### [`test-mux-credentials.sh`](test-mux-credentials.sh)
Quick Mux Credentials Test Script

**Usage:**
```bash
./test-mux-credentials.sh
```

*Language: bash • ✓ Executable*

### [`test-mux-stream.js`](test-mux-stream.js)
**Usage:**
```bash
node test-mux-stream.js
```

*Language: javascript • ✓ Executable*

### [`test-paywall-e2e.sh`](test-paywall-e2e.sh)
End-to-end test for paywall workflow with Mailpit

**Usage:**
```bash
./test-paywall-e2e.sh
```

*Language: bash • ✓ Executable*

### [`test-production-password.sh`](test-production-password.sh)
Test script for production password fix

**Usage:**
```bash
./test-production-password.sh
```

*Language: bash • ✓ Executable*

### [`test-production-ready.sh`](test-production-ready.sh)
Production Readiness Test for TCHS Games with Chat

**Usage:**
```bash
./test-production-ready.sh [arguments]
```

*Language: bash • ✓ Executable • ⚠️ Requires arguments*

### [`test-railway-graphql.sh`](test-railway-graphql.sh)
##############################################################################

**Usage:**
```bash
./test-railway-graphql.sh
```

*Language: bash • ✓ Executable*

### [`test-stormfc-setup-local-auto.sh`](test-stormfc-setup-local-auto.sh)
Test STORMFC Setup Locally (Non-interactive)

**Usage:**
```bash
./test-stormfc-setup-local-auto.sh
```

*Language: bash • ✓ Executable*

### [`test-stormfc-setup-local.sh`](test-stormfc-setup-local.sh)
Test STORMFC Setup Locally

**Usage:**
```bash
./test-stormfc-setup-local.sh
```

*Language: bash • ✓ Executable*

## 🚀 Deployment Scripts

*Scripts for deploying to various environments*

### [`deploy-marketplace-production.sh`](deploy-marketplace-production.sh)
Deployment script for Marketplace Model A (Railway production)

**Usage:**
```bash
./deploy-marketplace-production.sh
```

*Language: bash • ✓ Executable*

### [`deploy-production.sh`](deploy-production.sh)
Production Deployment Script for Railway

**Usage:**
```bash
./deploy-production.sh
```

*Language: bash • ✓ Executable*

### [`deploy-railway.sh`](deploy-railway.sh)
###############################################################################

**Usage:**
```bash
./deploy-railway.sh [arguments]
```

*Language: bash • ✓ Executable • ⚠️ Requires arguments*

### [`pre-deploy-check.sh`](pre-deploy-check.sh)
Pre-Deployment Checklist for FieldView.live

**Usage:**
```bash
./pre-deploy-check.sh
```

*Language: bash • ✓ Executable*

### [`yolo-deploy.sh`](yolo-deploy.sh)
Validate service name

**Usage:**
```bash
./yolo-deploy.sh
```

*Language: bash • ✓ Executable*

## 🗄️ Database Scripts

*Scripts for database operations, migrations, and seeding*

### [`seed-direct-streams-jan16.ts`](seed-direct-streams-jan16.ts)
**Usage:**
```bash
node seed-direct-streams-jan16.ts
```

*Language: typescript • ✗ Not executable*

### [`seed-direct-streams.ts`](seed-direct-streams.ts)
Seed data for existing DirectStreams

**Usage:**
```bash
node seed-direct-streams.ts [arguments]
```

*Language: typescript • ✗ Not executable • ⚠️ Requires arguments*

### [`ensure-super-admin.ts`](ensure-super-admin.ts)
Create or update super admin in DB. Uses `DATABASE_URL` and `ADMIN_PASSWORD` (min 8 chars). Use when API is not available (e.g. seeding production DB directly).

**Usage:**
```bash
DATABASE_URL="postgresql://..." ADMIN_PASSWORD=yourpassword pnpm exec tsx scripts/ensure-super-admin.ts
```

*Language: typescript • ✗ Not executable*

### [`add-tchs-soccer-20260213.ts`](add-tchs-soccer-20260213.ts)
Add TCHS Soccer Feb 13 direct stream links (jv2, jv, varsity) to DB. Stream admin password: `tchs2026`. Use with local or production `DATABASE_URL`.

**Usage:**
```bash
DATABASE_URL="postgresql://..." pnpm exec tsx scripts/add-tchs-soccer-20260213.ts
```

*Language: typescript • ✗ Not executable*

### [`add-tchs-soccer-20260217.ts`](add-tchs-soccer-20260217.ts)
Add TCHS Soccer Feb 17 direct stream links (jv2, jv, varsity) to DB. Stream admin password: `tchs2026`. Use with local or production `DATABASE_URL`.

**Usage:**
```bash
DATABASE_URL="postgresql://..." pnpm exec tsx scripts/add-tchs-soccer-20260217.ts
```

*Language: typescript • ✗ Not executable*

### [`seed-production-streams.sh`](seed-production-streams.sh)
Seed DirectStreams to Production Database

**Usage:**
```bash
./seed-production-streams.sh
```

*Language: bash • ✓ Executable*

### [`seed-railway-job.sh`](seed-railway-job.sh)
Run seed script as Railway job (from within Railway environment)

**Usage:**
```bash
./seed-railway-job.sh
```

*Language: bash • ✓ Executable*

### [`seed-soccer-events-local.ts`](seed-soccer-events-local.ts)
Find the TCHS direct stream

**Usage:**
```bash
node seed-soccer-events-local.ts
```

*Language: typescript • ✗ Not executable*

### [`update-varsity-direct-db.js`](update-varsity-direct-db.js)
Get DATABASE_URL from Railway environment

**Usage:**
```bash
node update-varsity-direct-db.js [arguments]
```

*Language: javascript • ✗ Not executable • ⚠️ Requires arguments*

## 🔄 CI/CD Scripts

*Scripts used in CI/CD pipelines*

### [`ci-local.sh`](ci-local.sh)
Clean slate

**Usage:**
```bash
./ci-local.sh
```

*Language: bash • ✓ Executable*

## 🔧 Utility Scripts

*General utility and helper scripts*

### [`add-direct-links-api.sh`](add-direct-links-api.sh)
Add direct stream links via API. Log in as super admin, then create streams. Local default: `http://localhost:4301`; for production use `https://api.fieldview.live`. Set `ADMIN_PASSWORD` or prompt. Optional `STREAM_ADMIN_PASSWORD` (default `admin2026`).

**Usage:**
```bash
./scripts/add-direct-links-api.sh [API_BASE_URL] slug1 [slug2 ...]
# Production: ./scripts/add-direct-links-api.sh https://api.fieldview.live slug1 slug2
```

*Language: bash • ✓ Executable*

### [`add-tchs-soccer-20260213-api.sh`](add-tchs-soccer-20260213-api.sh)
Add TCHS Soccer Feb 13 direct links (jv2, jv, varsity) via API. Uses stream password `tchs2026`. Run `ensure-super-admin.sh` first if needed.

**Usage:**
```bash
./scripts/add-tchs-soccer-20260213-api.sh                    # local
./scripts/add-tchs-soccer-20260213-api.sh https://api.fieldview.live   # production
```

*Language: bash • ✓ Executable*

### [`add-tchs-soccer-20260217-api.sh`](add-tchs-soccer-20260217-api.sh)
Add TCHS Soccer Feb 17 direct links (jv2, jv, varsity) via API. Uses stream password `tchs2026`. Run `ensure-super-admin.sh` first if needed.

**Usage:**
```bash
./scripts/add-tchs-soccer-20260217-api.sh                    # local
./scripts/add-tchs-soccer-20260217-api.sh https://api.fieldview.live   # production
```

*Language: bash • ✓ Executable*

### [`add-tchs-soccer-games-20260112.js`](add-tchs-soccer-games-20260112.js)
Find the parent TCHS stream

**Usage:**
```bash
node add-tchs-soccer-games-20260112.js
```

*Language: javascript • ✗ Not executable*

### [`check-local-events.ts`](check-local-events.ts)
**Usage:**
```bash
node check-local-events.ts
```

*Language: typescript • ✗ Not executable*

### [`check-square-env.sh`](check-square-env.sh)
Check Square environment variables setup

**Usage:**
```bash
./check-square-env.sh
```

*Language: bash • ✓ Executable*

### [`check-stormfc-production.sh`](check-stormfc-production.sh)
Check if STORMFC paths are set up in production

**Usage:**
```bash
./check-stormfc-production.sh
```

*Language: bash • ✓ Executable*

### [`create-sample-event.ts`](create-sample-event.ts)
Find TCHS parent stream

**Usage:**
```bash
node create-sample-event.ts
```

*Language: typescript • ✗ Not executable*

### [`enable-stream-features.ts`](enable-stream-features.ts)
**Usage:**
```bash
node enable-stream-features.ts
```

*Language: typescript • ✗ Not executable*

### [`fix-stream-url-direct.js`](fix-stream-url-direct.js)
Quick fix for stream URL typo

**Usage:**
```bash
node fix-stream-url-direct.js
```

*Language: javascript • ✗ Not executable*

### [`fix-stream-url-simple.js`](fix-stream-url-simple.js)
Find the parent stream

**Usage:**
```bash
node fix-stream-url-simple.js
```

*Language: javascript • ✗ Not executable*

### [`fix-streamurl-typo-job.sh`](fix-streamurl-typo-job.sh)
Fix Stream URL Typo (run as Railway job)

**Usage:**
```bash
./fix-streamurl-typo-job.sh
```

*Language: bash • ✓ Executable*

### [`fix-streamurl-typo.ts`](fix-streamurl-typo.ts)
Fix DirectStream parent streams

**Usage:**
```bash
node fix-streamurl-typo.ts
```

*Language: typescript • ✗ Not executable*

### [`get-rtmp-credentials.sh`](get-rtmp-credentials.sh)
Get RTMP Credentials for a Game

**Usage:**
```bash
./get-rtmp-credentials.sh [arguments]
```

*Language: bash • ✓ Executable • ⚠️ Requires arguments*

### [`list-events.ts`](list-events.ts)
Check for DATABASE_URL env var, if not use production

**Usage:**
```bash
node list-events.ts
```

*Language: typescript • ✗ Not executable*

### [`railway-logs-graphql.js`](railway-logs-graphql.js)
Configuration

**Usage:**
```bash
node railway-logs-graphql.js
```

*Language: javascript • ✓ Executable*

### [`railway-logs.sh`](railway-logs.sh)
##############################################################################

**Usage:**
```bash
./railway-logs.sh [arguments]
```

*Language: bash • ✓ Executable • ⚠️ Requires arguments*

### [`railway-ready-check.sh`](railway-ready-check.sh)
PHASE 1: Critical Build & Type Safety (5 mins)

**Usage:**
```bash
./railway-ready-check.sh
```

*Language: bash • ✓ Executable*

### [`railway-start.sh`](railway-start.sh)
**Usage:**
```bash
./railway-start.sh
```

*Language: bash • ✓ Executable*

### [`show-e2e-flow.sh`](show-e2e-flow.sh)
Quick E2E Test Demo

**Usage:**
```bash
./show-e2e-flow.sh
```

*Language: bash • ✓ Executable*

### [`update-jv-stream-url.ts`](update-jv-stream-url.ts)
Find the parent stream

**Usage:**
```bash
node update-jv-stream-url.ts
```

*Language: typescript • ✗ Not executable*

### [`update-soccer-event-dates.ts`](update-soccer-event-dates.ts)
Load .env from apps/api

**Usage:**
```bash
node update-soccer-event-dates.ts
```

*Language: typescript • ✗ Not executable*

### [`update-tchs-events-jan13.ts`](update-tchs-events-jan13.ts)
Find the TCHS stream

**Usage:**
```bash
node update-tchs-events-jan13.ts
```

*Language: typescript • ✗ Not executable*

### [`update-varsity-job.sh`](update-varsity-job.sh)
Update Varsity Stream URL - Railway Job Wrapper

**Usage:**
```bash
./update-varsity-job.sh
```

*Language: bash • ✓ Executable*

### [`update-varsity-railway-job.sh`](update-varsity-railway-job.sh)
Railway Job: Update Varsity Stream URL

**Usage:**
```bash
./update-varsity-railway-job.sh [arguments]
```

*Language: bash • ✓ Executable • ⚠️ Requires arguments*

### [`update-varsity-stream-url-simple.js`](update-varsity-stream-url-simple.js)
Find the parent stream

**Usage:**
```bash
node update-varsity-stream-url-simple.js
```

*Language: javascript • ✗ Not executable*

### [`update-varsity-stream-url.ts`](update-varsity-stream-url.ts)
Find the parent stream

**Usage:**
```bash
node update-varsity-stream-url.ts
```

*Language: typescript • ✓ Executable*

### [`update-varsity-via-api.sh`](update-varsity-via-api.sh)
Update Varsity Stream URL via Admin API

**Usage:**
```bash
./update-varsity-via-api.sh
```

*Language: bash • ✓ Executable*

### [`verify-owner-square.ts`](verify-owner-square.ts)
Find the first owner account (adjust query as needed)

**Usage:**
```bash
node verify-owner-square.ts
```

*Language: typescript • ✗ Not executable*

---

*This index is automatically generated by devibe. Do not edit manually.*
