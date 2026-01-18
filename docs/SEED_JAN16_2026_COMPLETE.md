# Direct Stream Seeds - January 16, 2026

## ✅ Seeding Complete

All direct stream events have been successfully added to both **local** and **production** databases.

---

## 📺 TCHS Soccer Events

Base URL: `https://fieldview.live/direct/tchs/`

| Event | Full URL | Time (CST) |
|-------|----------|------------|
| JV2 | https://fieldview.live/direct/tchs/soccer-20260116-jv2 | 4:30 PM |
| JV | https://fieldview.live/direct/tchs/soccer-20260116-jv | 6:00 PM |
| Varsity | https://fieldview.live/direct/tchs/soccer-20260116-varsity | 7:30 PM |

**Admin Panel Access:**
- Password: `tchs2026`

---

## 📺 Denton Diablos Soccer Events

Base URL: `https://fieldview.live/direct/dentondiablos/`

| Event | Full URL | Opponent | Time (CST) |
|-------|----------|----------|------------|
| Game 1 | https://fieldview.live/direct/dentondiablos/soccer-202601161100-texas-warriors | Texas Warriors | Jan 16, 11:00 AM |
| Game 2 | https://fieldview.live/direct/dentondiablos/soccer-202601161530-avanti-sa-white | Avanti SA White | Jan 16, 3:30 PM |
| Game 3 | https://fieldview.live/direct/dentondiablos/soccer-202601170930-ntx-united | NTX United | Jan 17, 9:30 AM |
| Final | https://fieldview.live/direct/dentondiablos/soccer-202601171400-final | Tournament Final | Jan 17, 2:00 PM |

**Admin Panel Access:**
- Password: `devil2026`

---

## 🔧 Technical Details

### Database Configuration

**Local:**
```bash
DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public"
```

**Production:**
```bash
DATABASE_URL="postgresql://postgres:yrCdfWDvdeHwLfEvqGuKgLWjxASIMoZV@gondola.proxy.rlwy.net:42430/railway?sslmode=require"
```

### Seed Script

Location: `scripts/seed-direct-streams-jan16.ts`

Features:
- ✅ Creates/reuses OwnerAccount
- ✅ Creates DirectStream with admin password
- ✅ Creates DirectStreamEvent entries
- ✅ Enables chat and scoreboard by default
- ✅ Upserts for idempotency (can run multiple times safely)

### API Endpoints

Bootstrap endpoint format:
```
GET /api/public/direct/:slug/events/:eventSlug/bootstrap
```

Example:
```bash
curl https://api.fieldview.live/api/public/direct/tchs/events/soccer-20260116-varsity/bootstrap
```

Response includes:
- Stream URL
- Chat/scoreboard enabled flags
- Paywall configuration
- Team names and colors

---

## ✅ Verification

All endpoints tested and working in production:

```bash
# TCHS Events
✅ /direct/tchs/soccer-20260116-jv2
✅ /direct/tchs/soccer-20260116-jv
✅ /direct/tchs/soccer-20260116-varsity

# Denton Diablos Events
✅ /direct/dentondiablos/soccer-202601161100-texas-warriors
✅ /direct/dentondiablos/soccer-202601161530-avanti-sa-white
✅ /direct/dentondiablos/soccer-202601170930-ntx-united
✅ /direct/dentondiablos/soccer-202601171400-final
```

---

## 🎯 Features Enabled

All events include:
- ✅ Real-time chat
- ✅ Live scoreboard (tap-to-edit for authenticated users)
- ✅ Mobile-first responsive design
- ✅ Collapsible overlays
- ✅ Cross-stream authentication
- ✅ Admin panel for stream control

---

## 📝 Notes

1. **Admin Passwords** are hashed with bcrypt and stored securely
2. **Event URLs** use lowercase slugs for consistency
3. **Scheduled Times** are stored in CST timezone
4. **Chat/Scoreboard** can be toggled via admin panel
5. **Stream URLs** can be added via admin panel when ready to go live

