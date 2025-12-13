# Executive Summary — FieldView.Live Implementation Plan

## MVP Scope

FieldView.Live is a monetization platform for youth sports live streaming that enables camera owners to generate revenue from their streams while protecting content and monitoring viewers.

### Core Capabilities (MVP)

1. **Owner Onboarding**: Registration, Square Connect payout setup
2. **Game Management**: Create games with keywords, QR codes, stream source configuration
3. **Text-to-Pay Flow**: SMS keyword → payment link → watch link (primary conversion)
4. **QR-to-Pay Flow**: QR scan → payment → watch (secondary)
5. **Payment Processing**: Square integration with marketplace splits (platform fee vs owner earnings)
6. **Stream Protection**: Entitlement-gated access (purchase-only)
7. **Stream Support**: Mux-managed, BYO HLS, BYO RTMP, external platform embeds
8. **Viewer Monitoring**: Email-required identity, owner audience views, SuperAdmin drill-down
9. **Quality Telemetry**: Buffering/error tracking for refund evaluation
10. **Automatic Refunds**: Deterministic rules based on telemetry
11. **Owner Dashboard**: Revenue analytics, audience monitoring (masked emails)
12. **Admin Console**: Support workflows, MFA, search, audit logging

### Success Criteria

**Functional**:
- All functional requirements (FR-1 through FR-9) implemented
- 100% test coverage across all packages
- All API endpoints tested (unit + integration)
- Critical flows tested end-to-end

**Performance**:
- SMS keyword response: < 2s p95
- Payment → watch link: < 10s p95
- Watch start latency: < 5s p95
- Dashboard load: < 2s p95

**User Experience**:
- Purchase flow completes in < 30 seconds
- Watch link works without login
- Clear stream states (not started/live/ended/unavailable)
- Owners can see ROI and audience conversion

**Deployment**:
- Application deployed to Railway (staging + production)
- Tag-based releases from `main` branch
- Monitoring and logging operational

## Timeline Estimate

**Total Duration**: ~12 weeks (3 months)

**Phase Breakdown**:
- **Week 1**: Repository setup, monorepo skeleton, OpenAPI contracts
- **Week 2**: Data model package, API foundation
- **Weeks 3-8**: Core features (owner auth, games, SMS, payments, entitlements, streaming, playback, refunds, dashboards, admin)
- **Week 9**: External integrations (SendGrid, streaming provider)
- **Week 10**: Testing infrastructure, E2E tests
- **Week 11**: Railway deployment setup
- **Week 12**: Final QA, documentation, release

## Critical Risks & Mitigations

### Risk 1: Stream Protection Complexity
**Risk**: BYO HLS and external embeds cannot be fully protected
**Mitigation**: 
- Clear documentation of protection guarantees per stream type
- Owner guidance to use private/unlisted streams for external platforms
- UI warnings about protection limits

### Risk 2: Square Integration Learning Curve
**Risk**: Square Connect marketplace model differs from Stripe Connect
**Mitigation**:
- Early integration testing with Square sandbox
- Reference Square documentation and support
- Fallback to manual payout processing if needed

### Risk 3: Test Coverage Enforcement
**Risk**: 100% coverage requirement may slow development
**Mitigation**:
- TDD approach ensures tests written first
- Coverage gates in CI prevent regressions
- Focus on critical paths first, expand coverage incrementally

### Risk 4: Streaming Provider Costs
**Risk**: Mux costs may exceed projections at scale
**Mitigation**:
- Start with Mux for MVP (simpler setup)
- Monitor costs closely
- Plan migration path to AWS MediaLive if needed

## Quality Gates

Each phase must meet these gates before proceeding:

1. **Code Quality**: Lint passes, type-check passes, no critical security issues
2. **Test Coverage**: 100% coverage for new code (enforced in CI)
3. **Integration**: Features work end-to-end (not just unit tests)
4. **Documentation**: APIs documented, complex logic explained
5. **Performance**: Meets performance targets (where applicable)

## Dependencies

**External Services** (must be configured):
- Twilio account + phone number
- SendGrid account + API key
- Square application + access token
- Mux account + API credentials
- Railway account + project

**Infrastructure**:
- PostgreSQL database (Railway managed)
- Redis cache (Railway addon)
- Docker for containerization

## Next Steps

1. Review this executive summary
2. Proceed to [01-repo-and-release-workflow.md](./01-repo-and-release-workflow.md) for Git setup
3. Follow phases sequentially
4. Reference product specs in `../` for detailed requirements
