# Railway Logs Directory

This directory contains downloaded Railway logs for triage and analysis.

## Files

### API Service Logs
- `api-full-*.log` - Complete API logs (last 5000 lines)
- `api-errors-*.log` - Filtered errors, warnings, and failures only
- `api-deployments-*.log` - List of all deployments with status
- `api-failed-deployments-*.log` - Logs from failed deployments

### Web Service Logs
- `web-full-*.log` - Complete Web logs (last 5000 lines)
- `web-errors-*.log` - Filtered errors, warnings, and failures only

## Quick Analysis

### Top Errors Found

1. **VideoClip Table Missing (P2021)**
   - Error: `PrismaClientKnownRequestError` - table "public.VideoClip" does not exist
   - Frequency: Every 6 hours (cleanup job)
   - Status: ✅ FIXED - Migration applied to production

2. **Client Validation Errors**
   - Error: `BadRequestError` - Expected string, received null for viewerIdentityId
   - Frequency: Occasional
   - Status: ⚠️ Needs investigation

3. **Deployment Failures**
   - Count: 12+ consecutive failures
   - Status: ⚠️ Under investigation - startup validation issue

## How to Use

```bash
# View all API errors
cat logs/railway/api-errors-*.log

# Search for specific errors
grep -i "P2021" logs/railway/api-*.log

# View deployment status
cat logs/railway/api-deployments-*.log

# Count error types
grep -o "code\":\"[^\"]*\"" logs/railway/api-errors-*.log | sort | uniq -c
```

## Downloading New Logs

To download fresh logs:

```bash
# Use the helper script
./scripts/railway-logs.sh errors api > logs/railway/api-errors-$(date +%Y%m%d-%H%M%S).log

# Or use Railway CLI directly
railway logs --service api --lines 5000 > logs/railway/api-full-$(date +%Y%m%d-%H%M%S).log
```

## Notes

- Logs are timestamped with format: `YYYYMMDD-HHMMSS`
- Full logs may be large (100KB+)
- Error logs are filtered and much smaller
- Failed deployment logs may take time to download
