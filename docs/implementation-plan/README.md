# FieldView.Live Implementation Plan

This directory contains the detailed, executable implementation plan for building FieldView.Live MVP.

## Table of Contents

1. [00-executive-summary.md](./00-executive-summary.md) - MVP scope, success criteria, timeline, critical risks
2. [01-repo-and-release-workflow.md](./01-repo-and-release-workflow.md) - Git branching, CI/CD, tag-based releases
3. [02-monorepo-and-tooling.md](./02-monorepo-and-tooling.md) - pnpm workspace, TypeScript, linting, Docker setup
4. [03-openapi-and-contracts.md](./03-openapi-and-contracts.md) - Swagger-first approach, OpenAPI YAML, type generation
5. [04-data-model-package.md](./04-data-model-package.md) - @fieldview/data-model package implementation
6. [05-api-implementation.md](./05-api-implementation.md) - Express API implementation (FR-1 through FR-9)
7. [06-web-implementation.md](./06-web-implementation.md) - Next.js frontend implementation
8. [07-streaming-and-protection.md](./07-streaming-and-protection.md) - Stream monetization (Mux, BYO HLS/RTMP, external embeds)
9. [08-payments-and-ledger.md](./08-payments-and-ledger.md) - Square integration, marketplace splits, ledger accounting
10. [09-sms-email-notifications.md](./09-sms-email-notifications.md) - Twilio SMS, SendGrid email integration
11. [10-refunds-telemetry.md](./10-refunds-telemetry.md) - Quality telemetry, deterministic refunds, job queues
12. [11-owner-dashboard-and-audience.md](./11-owner-dashboard-and-audience.md) - Owner analytics, audience monitoring
13. [12-admin-console-and-audit.md](./12-admin-console-and-audit.md) - Admin console, MFA, search, audit logging
14. [13-testing-strategy-e2e.md](./13-testing-strategy-e2e.md) - Testing strategy: unit, integration, contract, E2E
15. [14-railway-deployment.md](./14-railway-deployment.md) - Railway deployment, environments, release process

## How to Use This Plan

### For Developers
1. Start with [00-executive-summary.md](./00-executive-summary.md) to understand scope and timeline
2. Follow phases sequentially (01 → 02 → 03 → ...)
3. Each phase has clear acceptance criteria and quality gates
4. Reference related spec documents in `docs/` for detailed requirements

### For Project Managers
- Use [00-executive-summary.md](./00-executive-summary.md) for timeline and milestones
- Track progress against phase gates
- Each phase document includes estimated effort and dependencies

### For Architects
- Review [03-openapi-and-contracts.md](./03-openapi-and-contracts.md) for API contracts
- Review [04-data-model-package.md](./04-data-model-package.md) for data layer
- Review [07-streaming-and-protection.md](./07-streaming-and-protection.md) for streaming architecture

## Key Principles

- **TDD**: Write tests before implementation (100% coverage required)
- **ISP**: Interface Segregation Principle (focused interfaces, not bloated)
- **Swagger-first**: OpenAPI spec before implementation
- **No static mocks**: Use Prism mock server or real services
- **Event-driven**: Use DataEventBus for cross-boundary communication
- **Componentized**: Build and test independently before integration

## Related Documentation

- **Product Specs**: See `../` directory (00-overview.md through 08-admin-and-superadmin.md)
- **Design Document**: See `../09-design-document.md`
- **Repository**: https://github.com/YOLOVibeCode/fieldview-live
