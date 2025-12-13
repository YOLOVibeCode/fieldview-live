# Refund & Quality Rules (Deterministic)

## Purpose
Provide a measurable, auditable guarantee for stream quality. Refund decisions must be reproducible from stored telemetry summaries and the versioned rule set.

## Telemetry inputs (per PlaybackSession)
- `totalWatchMs`: total time viewer attempted to watch (milliseconds)
- `totalBufferMs`: cumulative buffering time (milliseconds)
- `bufferEvents`: count of buffering interruptions
- `fatalErrors`: count of fatal playback errors (stream unavailable, codec errors)
- `startupLatencyMs`: time from player load to first frame (milliseconds)
- `streamDownMs`: time stream was unavailable (detected via heartbeat failures or provider status)

## Aggregation model (per Purchase)
A purchase may have multiple playback sessions (device switching, network changes). Refund evaluation uses an aggregated summary across sessions within entitlement validity:

- `watchMs = sum(totalWatchMs)` across all sessions
- `bufferMs = sum(totalBufferMs)` across all sessions
- `bufferEvents = sum(bufferEvents)` across all sessions
- `fatalErrors = sum(fatalErrors)` across all sessions
- `streamDownMs = sum(streamDownMs)` across all sessions (if available)

## Derived metrics
- **Buffer ratio**: \(bufferRatio = bufferMs / max(watchMs, 1)\)
- **Stream downtime ratio**: \(downtimeRatio = streamDownMs / max(expectedGameDurationMs, 1)\)
- **Interruptions**: `bufferEvents` (count)

## Quality window definition
- **Expected game duration**: `game.endsAt - game.startsAt` (if set) or default 90 minutes
- **Quality evaluation window**: from game start time to game end time (or entitlement validTo, whichever is earlier)

## Refund thresholds (MVP defaults)
These reflect the business plan intent and can be configured by SuperAdmin. All thresholds are versioned for auditability.

### 1. Full refund
**Trigger conditions** (any of):
- `bufferRatio > 0.20` (buffering > 20% of watch time)
- `downtimeRatio > 0.20` (stream down > 20% of expected game duration)
- `fatalErrors >= 3` AND `watchMs < 5 minutes` (multiple fatal errors with minimal watch time)

**Amount**: 100% of purchase amount

### 2. Half refund
**Trigger conditions** (any of):
- `0.10 < bufferRatio <= 0.20` (buffering 10-20% of watch time)
- `0.10 < downtimeRatio <= 0.20` (stream down 10-20% of expected game duration)
- `fatalErrors >= 1` AND `watchMs < 2 minutes` (fatal error with minimal watch time)

**Amount**: 50% of purchase amount

### 3. Partial refund (excessive buffering interruptions)
**Trigger condition**:
- `bufferEvents > 10` within a single purchase window (regardless of buffer ratio)

**Amount**: configurable (default 25% of purchase amount)

**Note**: This can stack with half refund (e.g., if bufferRatio is 15% AND bufferEvents > 10, apply half refund, not both)

### 4. No refund
**Conditions**:
- `bufferRatio <= 0.10` AND `downtimeRatio <= 0.10` AND `bufferEvents <= 10` AND `fatalErrors = 0`
- OR `watchMs < 30 seconds` (viewer never meaningfully watched; avoid fraud)

## Refund evaluation timing
Refund evaluation should run:
- **(a) After game ends**: evaluate all purchases for completed games
- **(b) Periodically**: near-real-time evaluation for active games (every 15 minutes) to catch severe issues early
- **(c) On session end**: if session ends and bufferRatio/downtimeRatio already exceeds thresholds, issue refund immediately

## Important clarifications
- **Low watch time**: If `watchMs` is extremely low (e.g., < 30 seconds), do not auto-refund without additional signals (avoid fraud). This is a SuperAdmin policy choice.
- **Multiple refunds**: A purchase can only be refunded once (full or partial). If multiple rules apply, apply the most generous refund.
- **Refund stacking**: Do not stack partial refunds (e.g., half refund + excessive buffering). Apply the highest applicable refund.

## Refund notification
When refund is issued, notify viewer via SMS:
- Amount refunded
- Reason summary (e.g., "Stream quality issues detected")
- Expected processing time (e.g., "5-7 business days")
- Support contact if questions

**Template**:
```
"FieldView.Live: We've issued a refund of $[amount] for [game title] due to stream quality issues. Processing: 5-7 business days. Questions? Reply HELP."
```

## Auditability requirements
Store the following for every refund decision:
- **Input telemetry summary**: `watchMs`, `bufferMs`, `bufferEvents`, `fatalErrors`, `streamDownMs`
- **Computed metrics**: `bufferRatio`, `downtimeRatio`
- **Applied rule**: which rule triggered (e.g., "full_refund_buffer_ratio_high")
- **Threshold version**: version of refund rules applied (e.g., "v1.0")
- **Resulting refund amount**: `amountCents`
- **Evaluation timestamp**: when decision was made

This enables:
- Reproducing refund decisions from stored data
- Auditing refund policy changes over time
- Debugging refund disputes

## Refund processing
- **Automatic refunds**: issued via Stripe refund API; webhook confirms processing
- **Manual refunds**: issued by admin (within policy bounds); same audit trail
- **Ledger entries**: create debit entry for refund; adjust owner payout accordingly

## Configuration (SuperAdmin)
SuperAdmin can configure thresholds (bounded):
- `fullRefundBufferRatio`: default 0.20 (20%)
- `halfRefundBufferRatio`: default 0.10 (10%)
- `excessiveBufferingEvents`: default 10
- `partialRefundPercent`: default 25%
- `minWatchTimeForRefund`: default 30 seconds (avoid fraud)

Changes to thresholds are versioned and audit-logged.
