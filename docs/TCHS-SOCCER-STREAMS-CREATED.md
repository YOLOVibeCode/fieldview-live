# TCHS Soccer Streams Created

## ✅ LOCAL Database - COMPLETE

Successfully created three DirectStream records in the local database:

### URLs (LOCAL):
- http://localhost:4300/direct/tchs/soccer-20260120-jv2
- http://localhost:4300/direct/tchs/soccer-20260120-jv
- http://localhost:4300/direct/tchs/soccer-20260120-varsity

### Stream Details:
- **Owner**: Lincoln High School Athletics
- **Chat Enabled**: Yes
- **Paywall**: No (free access)
- **Scoreboard Enabled**: Yes
- **Admin Password**: `tchs2026`

### Scoreboard Configuration:
- **Home Team Names**: "TCHS JV2", "TCHS JV", "TCHS Varsity"
- **Away Team**: "Away Team"
- **Home Jersey Color**: #003366 (Navy Blue)
- **Away Jersey Color**: #CC0000 (Red)
- **Initial Scores**: 0-0
- **Clock**: Stopped at 0:00

---

## 📋 PRODUCTION Database - PENDING

### Script Ready:
The production script is ready at:
```
apps/api/scripts/create-tchs-production.js
```

### To Run on Production:

**Option 1: Run via Railway Shell**
```bash
# From Railway web dashboard:
# 1. Go to your API service
# 2. Click "Shell"
# 3. Run:
cd /app/apps/api
node scripts/create-tchs-production.js
```

**Option 2: Run via Railway Job**
```bash
railway run --service api "cd apps/api && node scripts/create-tchs-production.js"
```

**Option 3: Add as Railway Deployment Script**
Add to `railway.toml`:
```toml
[[services]]
name = "api"

[services.deploy]
postDeploy = "node apps/api/scripts/create-tchs-production.js"
```

### Production URLs (After Running):
- https://fieldview.live/direct/tchs/soccer-20260120-jv2
- https://fieldview.live/direct/tchs/soccer-20260120-jv
- https://fieldview.live/direct/tchs/soccer-20260120-varsity

---

## 🔧 Technical Notes

### Database Schema Used:
- `DirectStream` model with required fields:
  - `slug` (unique identifier)
  - `title`
  - `streamUrl`
  - `ownerAccount` (relation)
  - `adminPassword`
  - `chatEnabled`, `paywallEnabled`, `priceInCents`
  - `scoreboardEnabled`

- `GameScoreboard` model:
  - `directStreamId` (FK to DirectStream)
  - `homeTeamName`, `awayTeamName`
  - `homeJerseyColor`, `awayJerseyColor`
  - `homeScore`, `awayScore`
  - `clockMode`, `clockSeconds`
  - `isVisible`, `position`

### Scripts Created:
1. **`create-tchs-local.js`** - For local database (✅ Executed successfully)
2. **`create-tchs-production.js`** - For production database (Ready to run)

Both scripts:
- Find or create owner account
- Upsert DirectStream records (won't duplicate if run multiple times)
- Upsert GameScoreboard records
- Support idempotent operations (safe to run multiple times)

---

## 🎯 Next Steps

1. **Test Local Streams**: Visit the local URLs above to verify they work
2. **Run Production Script**: Use one of the options above to create streams in production
3. **Update Stream URLs**: Replace placeholder stream URLs with actual Mux/streaming URLs:
   ```sql
   UPDATE "DirectStream" 
   SET "streamUrl" = 'https://stream.mux.com/ACTUAL_PLAYBACK_ID.m3u8'
   WHERE slug IN (
     'tchs/soccer-20260120-jv2',
     'tchs/soccer-20260120-jv',
     'tchs/soccer-20260120-varsity'
   );
   ```

4. **Test Scoreboards**: Verify scoreboard functionality on each stream
5. **Configure Team Names/Colors**: Update via the producer panel or API as needed

---

## 📞 Support

- Admin Password: `tchs2026`
- All streams have chat and scoreboards enabled
- No paywall (free access for viewers)
- Ready for live streaming once stream URLs are updated

