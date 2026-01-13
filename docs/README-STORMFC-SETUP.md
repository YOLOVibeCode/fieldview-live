# STORMFC Paths Setup

This document explains how to set up the STORMFC organization and channels for `stormfc@darkware.net`.

## 🧪 Testing Locally First (Recommended)

Before running in production, test the setup locally:

### Prerequisites
1. API server running locally: `pnpm --filter api dev`
2. User account exists: `stormfc@darkware.net`

### Run Local Test
```bash
cd scripts
./test-stormfc-setup-local.sh
```

This will:
- Check if API is running
- Prompt for password
- Create organization `STORMFC`
- Create channels for teams `2010` and `2008`
- Verify everything works

### If User Doesn't Exist Locally

First create the user:
```bash
curl -X POST http://localhost:4301/api/owners/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "stormfc@darkware.net",
    "password": "YOUR_PASSWORD",
    "name": "Storm FC",
    "type": "association"
  }'
```

---

## 🚀 Production Setup

## Option 1: Using Railway CLI (Recommended)

Run the TypeScript script directly in the Railway production environment:

```bash
railway run --service api pnpm exec tsx scripts/setup-stormfc-paths.ts
```

This will:
1. Find the user account for `stormfc@darkware.net`
2. Create organization `STORMFC` (if it doesn't exist)
3. Create channels for teams `2010` and `2008`
4. Ensure the user has `org_admin` membership

## Option 2: Using API Endpoints

Use the bash script to create via API:

```bash
cd scripts
./setup-stormfc-via-api.sh
```

This will prompt for the password and create the organization and channels via API calls.

## Option 3: Manual Setup via API

### 1. Login
```bash
curl -X POST https://api.fieldview.live/api/owners/login \
  -H "Content-Type: application/json" \
  -d '{"email":"stormfc@darkware.net","password":"YOUR_PASSWORD"}'
```

Save the token from the response.

### 2. Create Organization
```bash
curl -X POST https://api.fieldview.live/api/owners/me/watch-links/orgs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "shortName": "STORMFC",
    "name": "Storm FC"
  }'
```

### 3. Create Channel for 2010 Team
```bash
curl -X POST https://api.fieldview.live/api/owners/me/watch-links/orgs/STORMFC/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "teamSlug": "2010",
    "displayName": "2010 Team",
    "streamType": "byo_hls",
    "hlsManifestUrl": "https://placeholder.m3u8",
    "requireEventCode": false
  }'
```

### 4. Create Channel for 2008 Team
```bash
curl -X POST https://api.fieldview.live/api/owners/me/watch-links/orgs/STORMFC/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "teamSlug": "2008",
    "displayName": "2008 Team",
    "streamType": "byo_hls",
    "hlsManifestUrl": "https://placeholder.m3u8",
    "requireEventCode": false
  }'
```

## Result

After setup, the following paths will be available:
- `/STORMFC/2010` - for creating events for the 2010 team
- `/STORMFC/2008` - for creating events for the 2008 team

To create events, use:
```bash
POST /api/owners/me/orgs/STORMFC/channels/2010/events
POST /api/owners/me/orgs/STORMFC/channels/2008/events
```

## Notes

- The channels are created with `preset_c` link format: `/{org}/{teamSlug}/{urlKey}`
- Stream URLs can be updated later using `PATCH /api/owners/me/watch-links/orgs/STORMFC/channels/{teamSlug}`
- Events will generate URLs like: `/stormfc/2010/202502011430`

