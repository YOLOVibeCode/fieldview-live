# 🚀 Production Seed - Final Instructions

## ⚠️ Important: You Need the PUBLIC Database URL

The URL you provided (`postgres.railway.internal`) is an **internal Railway hostname** that only works from within Railway's network.

To seed from your local machine, you need the **public TCP proxy URL**.

---

## 📋 **How to Get Public DATABASE_URL:**

### **From Railway Dashboard (Recommended):**

1. Go to https://railway.app
2. Open project: `fieldview-live`
3. Click on the **Postgres** service
4. Go to **"Connect"** tab
5. Look for **"TCP Proxy"** section
6. Copy the connection string - it will look like:
   ```
   postgresql://postgres:yrCdfWDvdeHwLfEvqGuKgLWjxASIMoZV@containers-us-west-XXX.railway.app:6543/railway
   ```

Note the differences:
- ❌ Internal: `postgres.railway.internal:5432` (doesn't work from local)
- ✅ Public: `containers-us-west-XXX.railway.app:6543` (works from anywhere)

---

## 🚀 **Once You Have the Public URL:**

```bash
# Set the public URL
export DATABASE_PUBLIC_URL='postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:6543/railway'

# Run the seed script
./scripts/seed-production-streams.sh
```

**Expected Output:**
```
🌱 Seeding DirectStreams...
Environment: 🔴 PRODUCTION

✅ Using OwnerAccount: Your Owner Name
✅ Created: tchs - TCHS Live Stream

📊 Seed Summary:
   Created: 1
   Updated: 0
   Skipped: 0
   Total:   1

✅ Seeding complete!
```

---

## ✅ **Verify After Seeding:**

1. **Super Admin Console**: https://fieldview.live/superadmin/direct-streams
2. **TCHS Stream**: https://fieldview.live/tchs
3. **Admin Login**: Password is `tchs2026`

---

## 📝 **Current Status:**

- ✅ Local seed: **COMPLETE**
- ✅ Seed scripts: **READY**
- ⏳ Production seed: **Waiting for public DATABASE_URL**

---

**Next Step**: Get the public TCP proxy URL from Railway dashboard and run the seed script!

