# Refunds & Telemetry

## Overview

Deterministic refund system based on quality telemetry, with automatic evaluation and Square refund processing.

**Source**: `docs/07-refund-and-quality-rules.md`

## Telemetry Collection

### Client-Side Telemetry

**Events Collected**:
- Buffer events (start, end)
- Fatal errors
- Startup latency
- Watch duration

**Implementation**:
```typescript
// apps/web/hooks/useTelemetry.ts
export function useTelemetry(sessionId: string) {
  const [bufferEvents, setBufferEvents] = useState<BufferEvent[]>([]);
  const [fatalErrors, setFatalErrors] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setStartTime(new Date());
  }, []);
  
  const recordBufferStart = () => {
    setBufferEvents(prev => [...prev, { type: 'start', timestamp: new Date() }]);
  };
  
  const recordBufferEnd = () => {
    setBufferEvents(prev => [...prev, { type: 'end', timestamp: new Date() }]);
  };
  
  const recordFatalError = () => {
    setFatalErrors(prev => prev + 1);
  };
  
  const submitTelemetry = async () => {
    if (!startTime) return;
    
    const totalWatchMs = Date.now() - startTime.getTime();
    const totalBufferMs = bufferEvents.reduce((sum, event, idx, arr) => {
      if (event.type === 'start' && arr[idx + 1]?.type === 'end') {
        return sum + (arr[idx + 1].timestamp.getTime() - event.timestamp.getTime());
      }
      return sum;
    }, 0);
    
    await fetch(`/api/public/watch/${token}/telemetry`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        events: bufferEvents,
        fatalErrors,
        totalWatchMs,
        totalBufferMs,
      }),
    });
  };
  
  return { recordBufferStart, recordBufferEnd, recordFatalError, submitTelemetry };
}
```

### Server-Side Telemetry Storage

**Endpoint**: `POST /api/public/watch/:token/telemetry`

**Implementation**:
```typescript
// apps/api/src/routes/public.ts
app.post('/api/public/watch/:token/telemetry', async (req, res) => {
  const { sessionId, events, fatalErrors, totalWatchMs, totalBufferMs } = req.body;
  
  // Update playback session with telemetry
  await playbackSessionRepository.updateTelemetry(sessionId, {
    totalWatchMs,
    totalBufferMs,
    bufferEvents: events.length,
    fatalErrors,
  });
  
  res.json({ received: true });
});
```

## Telemetry Summary

### Aggregation Model

**Per Session**:
- `totalWatchMs`: Total watch time
- `totalBufferMs`: Total buffering time
- `bufferEvents`: Count of buffer events
- `fatalErrors`: Count of fatal errors
- `startupLatencyMs`: Time to first frame

**Per Purchase** (aggregated across all sessions):
- `totalWatchMs`: Sum of all session watch times
- `totalBufferMs`: Sum of all session buffer times
- `bufferRatio`: `totalBufferMs / totalWatchMs`
- `downtimeRatio`: `(totalWatchMs - expectedWatchMs) / expectedWatchMs`
- `fatalErrors`: Sum of fatal errors

### Calculation

```typescript
// apps/api/src/services/TelemetryService.ts
export async function aggregateTelemetryForPurchase(purchaseId: string): Promise<TelemetrySummary> {
  const entitlement = await entitlementRepository.findByPurchaseId(purchaseId);
  const sessions = await playbackSessionRepository.findByEntitlementId(entitlement.id);
  
  const totalWatchMs = sessions.reduce((sum, s) => sum + s.totalWatchMs, 0);
  const totalBufferMs = sessions.reduce((sum, s) => sum + s.totalBufferMs, 0);
  const fatalErrors = sessions.reduce((sum, s) => sum + s.fatalErrors, 0);
  
  const bufferRatio = totalWatchMs > 0 ? totalBufferMs / totalWatchMs : 0;
  
  // Expected watch time: game duration (or minimum 1 hour)
  const game = await gameRepository.getById(purchase.gameId);
  const expectedWatchMs = game.endsAt && game.startsAt
    ? game.endsAt.getTime() - game.startsAt.getTime()
    : 60 * 60 * 1000; // 1 hour default
  
  const downtimeRatio = totalWatchMs > 0
    ? (expectedWatchMs - totalWatchMs) / expectedWatchMs
    : 1; // No watch time = 100% downtime
  
  return {
    totalWatchMs,
    totalBufferMs,
    bufferRatio,
    downtimeRatio,
    fatalErrors,
    sessionCount: sessions.length,
  };
}
```

## Refund Rules (Deterministic)

### Rule Versioning

**Format**: `v1.0.0` (semver)

**Storage**: Refund rules stored in database with version, enabling rule changes without breaking audit trail.

### Refund Thresholds

**From `docs/07-refund-and-quality-rules.md`**:

1. **Buffer Ratio High** (>20%):
   - Refund: 100% of purchase amount
   - Reason code: `buffer_ratio_high`

2. **Buffer Ratio Medium** (10-20%):
   - Refund: 50% of purchase amount
   - Reason code: `buffer_ratio_medium`

3. **Excessive Buffering** (>5 buffer events per minute):
   - Refund: 100% of purchase amount
   - Reason code: `excessive_buffering`

4. **Fatal Errors** (≥3 fatal errors):
   - Refund: 100% of purchase amount
   - Reason code: `fatal_error`

5. **Downtime** (>50% expected watch time missed):
   - Refund: 100% of purchase amount
   - Reason code: `downtime_high`

### Refund Calculator

```typescript
// apps/api/src/services/RefundService.ts
export interface RefundRule {
  version: string;
  thresholds: {
    bufferRatioHigh: number; // 0.20
    bufferRatioMedium: number; // 0.10
    excessiveBufferingRate: number; // 5 events per minute
    fatalErrorCount: number; // 3
    downtimeRatio: number; // 0.50
  };
}

export function evaluateRefundEligibility(
  telemetry: TelemetrySummary,
  purchaseAmountCents: number,
  rule: RefundRule = DEFAULT_REFUND_RULE
): RefundEvaluation {
  const reasons: string[] = [];
  let refundAmountCents = 0;
  
  // Buffer ratio high (>20%)
  if (telemetry.bufferRatio > rule.thresholds.bufferRatioHigh) {
    reasons.push('buffer_ratio_high');
    refundAmountCents = purchaseAmountCents; // 100%
  }
  // Buffer ratio medium (10-20%)
  else if (telemetry.bufferRatio >= rule.thresholds.bufferRatioMedium) {
    reasons.push('buffer_ratio_medium');
    refundAmountCents = Math.round(purchaseAmountCents * 0.5); // 50%
  }
  
  // Excessive buffering (>5 events per minute)
  const watchMinutes = telemetry.totalWatchMs / (60 * 1000);
  const bufferingRate = watchMinutes > 0 ? telemetry.bufferEvents / watchMinutes : 0;
  if (bufferingRate > rule.thresholds.excessiveBufferingRate) {
    reasons.push('excessive_buffering');
    refundAmountCents = purchaseAmountCents; // 100% (override if higher)
  }
  
  // Fatal errors (≥3)
  if (telemetry.fatalErrors >= rule.thresholds.fatalErrorCount) {
    reasons.push('fatal_error');
    refundAmountCents = purchaseAmountCents; // 100% (override if higher)
  }
  
  // Downtime (>50%)
  if (telemetry.downtimeRatio > rule.thresholds.downtimeRatio) {
    reasons.push('downtime_high');
    refundAmountCents = purchaseAmountCents; // 100% (override if higher)
  }
  
  return {
    eligible: refundAmountCents > 0,
    refundAmountCents,
    reasonCode: reasons[0] || null,
    allReasons: reasons,
    ruleVersion: rule.version,
  };
}
```

## Refund Evaluation Job

### Timing

**Quality Window**: 2 hours after game end time (or 4 hours after purchase if game not started)

**Job Schedule**: Run evaluation job every 15 minutes, check for purchases in quality window

### Implementation (BullMQ)

```typescript
// apps/api/src/jobs/refundEvaluation.ts
import { Queue } from 'bullmq';
import { refundService } from '@/services/RefundService';

const refundQueue = new Queue('refund-evaluation', {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
});

// Schedule evaluation job
export async function scheduleRefundEvaluation(purchaseId: string, gameEndTime: Date) {
  const qualityWindowEnd = new Date(gameEndTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  
  await refundQueue.add(
    'evaluate-refund',
    { purchaseId },
    {
      delay: qualityWindowEnd.getTime() - Date.now(),
    }
  );
}

// Process evaluation job
refundQueue.process('evaluate-refund', async (job) => {
  const { purchaseId } = job.data;
  
  // Aggregate telemetry
  const telemetry = await telemetryService.aggregateTelemetryForPurchase(purchaseId);
  
  // Evaluate refund eligibility
  const purchase = await purchaseRepository.getById(purchaseId);
  const evaluation = refundService.evaluateRefundEligibility(
    telemetry,
    purchase.amountCents
  );
  
  if (evaluation.eligible) {
    // Issue refund
    await refundService.issueRefund(
      purchaseId,
      evaluation.reasonCode!,
      telemetry,
      evaluation.ruleVersion
    );
  }
});
```

## Refund Issuance

### Square Refund

```typescript
// apps/api/src/services/RefundService.ts
export async function issueRefund(
  purchaseId: string,
  reasonCode: string,
  telemetrySummary: TelemetrySummary,
  ruleVersion: string
): Promise<Refund> {
  const purchase = await purchaseRepository.getById(purchaseId);
  
  if (purchase.status === 'refunded' || purchase.status === 'partially_refunded') {
    throw new Error('Purchase already refunded');
  }
  
  const evaluation = evaluateRefundEligibility(telemetrySummary, purchase.amountCents);
  
  // Create Square refund
  const squareRefund = await squareClient.refunds.refundPayment({
    idempotencyKey: `refund-${purchaseId}-${Date.now()}`,
    amountMoney: {
      amount: evaluation.refundAmountCents,
      currency: purchase.currency,
    },
    paymentId: purchase.paymentProviderPaymentId!,
    reason: reasonCode,
  });
  
  // Create Refund record
  const refund = await refundRepository.create({
    purchaseId,
    amountCents: evaluation.refundAmountCents,
    reasonCode,
    issuedBy: 'auto',
    ruleVersion,
    telemetrySummary: telemetrySummary as any, // JSON snapshot
  });
  
  // Update Purchase status
  const newStatus = evaluation.refundAmountCents === purchase.amountCents
    ? 'refunded'
    : 'partially_refunded';
  
  await purchaseRepository.update(purchaseId, {
    status: newStatus,
    refundedAt: new Date(),
  });
  
  // Create ledger entry
  await ledgerService.createRefundEntry(purchase, refund);
  
  // Send notifications (SMS + email)
  await smsService.sendRefundNotification(purchase, refund);
  await emailService.sendRefundNotification(purchase, refund);
  
  return refund;
}
```

## Manual Refunds (Admin)

**Endpoint**: `POST /api/admin/purchases/:purchaseId/refund`

**Implementation**:
```typescript
app.post('/api/admin/purchases/:purchaseId/refund', requireAdminAuth, async (req, res) => {
  const { purchaseId } = req.params;
  const { reason, amountCents } = req.body;
  const adminUser = req.user;
  
  const purchase = await purchaseRepository.getById(purchaseId);
  
  // Issue refund
  const refund = await refundService.issueManualRefund(
    purchaseId,
    reason || 'manual',
    amountCents || purchase.amountCents,
    adminUser.id
  );
  
  // Log admin action
  await auditLogService.log({
    adminUserId: adminUser.id,
    actionType: 'refund_create',
    targetType: 'purchase',
    targetId: purchaseId,
    reason,
  });
  
  res.json({ refund });
});
```

## Acceptance Criteria

- [ ] Telemetry collected from client
- [ ] Telemetry aggregated per purchase
- [ ] Refund rules applied deterministically
- [ ] Refund evaluation job runs on schedule
- [ ] Square refund created successfully
- [ ] Refund records created with telemetry snapshot
- [ ] Ledger entries created
- [ ] SMS/email notifications sent
- [ ] Manual refunds work (admin)
- [ ] Audit logging for manual refunds
- [ ] 100% test coverage

## Next Steps

- Proceed to [11-owner-dashboard-and-audience.md](./11-owner-dashboard-and-audience.md) for dashboard implementation
