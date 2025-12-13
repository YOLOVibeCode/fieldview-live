# Non-Functional Requirements & Compliance

## Reliability & availability
- **Platform pages** (payment/watch/admin): target **99.9%** uptime (excluding planned maintenance).
- **Webhook handling** (SMS/payment): must be resilient with retries and idempotency.
- **Stream availability**: target > 95% uptime during scheduled game time windows.

## Performance targets (initial)
- **SMS keyword response**: < 2s p95 (excluding carrier delivery)
- **Payment page LCP** (Largest Contentful Paint): < 2.5s p75 on mobile LTE
- **Watch start latency** (player to first frame): < 5s p95 on reasonable connections (10+ Mbps)
- **Dashboard load time**: < 2s p95
- **Admin search**: < 2s p95

## Security

### Entitlement tokens
- **Signed, expiring entitlement tokens** required for watch access.
- Do not expose permanent stream URLs that grant access without entitlement validation.
- Token validity window:
  - Default: game start time → game end time + 2 hours grace period
  - Configurable per game (owner can extend)
  - Minimum: 1 hour; maximum: 24 hours (configurable by SuperAdmin)

### Rate limiting
- **Inbound SMS**: 10 requests per phone number per minute
- **Checkout attempts**: 5 attempts per phone/IP per 15 minutes
- **Watch page loads**: 100 requests per entitlement token per hour
- **Admin actions**: 50 actions per admin user per minute

### Authentication
- **Owner/admin**: email/password with password reset
- **Admin**: email/password + **MFA (TOTP)** required
- **Session timeouts**:
  - Owner/admin: 24 hours inactivity
  - Admin: 8 hours inactivity
  - Step-up auth required for high-risk actions (refunds, config changes)

### Data protection
- Encrypt sensitive secrets (camera credentials, API keys) at rest
- Use HTTPS/TLS for all API and web traffic
- Hash phone numbers and IPs where stored for analytics (not for core operations)

## Privacy & PII handling
- **Phone numbers**: treat as PII; normalize to E.164; respect opt-out state
- **Minimize data collection**: store only what is required for operations/refunds/accounting
- **Data retention**:
  - Purchase/ledger/refund records: retain for accounting requirements (7+ years)
  - Per-session telemetry summaries: 90-180 days (unless needed longer for dispute resolution)
  - SMS message bodies: 90 days (for support); then anonymize
- **Right to deletion**: support viewer data deletion requests (anonymize purchases, retain ledger for accounting)

## SMS compliance (TCPA/CTIA)
- **STOP handling**: immediately opt out; do not send future marketing messages
- **HELP handling**: reply with instructions and support contact
- **Opt-out state**: maintain per phone number; respect across all outbound messages
- **Transactional vs marketing**: MVP default is transactional (payment/watch/refund); future marketing requires explicit opt-in
- **Message frequency**: limit outbound messages per phone number (e.g., 10 per day)

## Observability

### Structured logging
Log the following events with structured JSON:
- **Inbound SMS**: phone, keyword, gameId, response sent
- **Payment lifecycle**: purchaseId, status transitions, webhook events
- **Entitlement creation/validation**: purchaseId, tokenId, validation result
- **Refund decisions**: purchaseId, telemetry inputs, computed metrics, rule applied, refund amount
- **Admin actions**: adminUserId, actionType, targetType, targetId, reason

### Metrics & alerts
Monitor and alert on:
- **Webhook failure rates**: > 5% failure rate triggers alert
- **Payment success/failure rates**: < 85% success rate triggers alert
- **Refund spikes**: > 10% refund rate in 1 hour triggers alert
- **Stream availability errors**: > 5% error rate during game time triggers alert
- **SMS delivery failures**: > 10% failure rate triggers alert

### Health checks
- **API health**: `/health` endpoint returns 200 if service is operational
- **Database connectivity**: health check includes DB ping
- **External dependencies**: monitor Stripe, Twilio, streaming provider availability

## Data retention (suggested defaults)
- **Purchase/ledger/refund records**: retain indefinitely (accounting requirements)
- **Per-session telemetry summaries**: 180 days (unless needed longer for dispute resolution)
- **SMS message bodies**: 90 days (for support); then anonymize (keep metadata)
- **Admin audit logs**: retain indefinitely (security/compliance)

## Scalability considerations (MVP)
- **Database**: support 10,000+ games, 100,000+ purchases (MVP scale)
- **SMS throughput**: handle 100+ inbound SMS per minute
- **Payment webhooks**: handle 50+ webhooks per minute
- **Streaming**: support 100+ concurrent viewers per game

## Error handling
- **Graceful degradation**: if streaming provider fails, show error + refund eligibility message
- **Webhook retries**: exponential backoff (1s, 2s, 4s, 8s, 16s) with max 5 retries
- **Idempotency**: all webhook handlers must be idempotent (handle duplicate events)

## Compliance notes
- **PCI DSS**: payment processing via Stripe (PCI-compliant provider); do not store raw card data
- **GDPR**: support data deletion requests; respect opt-out; data minimization
- **TCPA**: SMS opt-out compliance (STOP/HELP)
- **Accounting**: ledger entries must be immutable and auditable
