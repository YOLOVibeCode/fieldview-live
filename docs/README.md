# FieldView.Live Specifications

This directory contains the MVP-focused product and system specifications for FieldView.Live.

## Table of contents
1. [00-overview.md](./00-overview.md)
2. [01-personas-and-roles.md](./01-personas-and-roles.md)
3. [02-user-flows.md](./02-user-flows.md)
4. [03-functional-requirements.md](./03-functional-requirements.md)
5. [04-data-model.md](./04-data-model.md)
6. [05-api-spec-outline.md](./05-api-spec-outline.md)
7. [06-nonfunctional-and-compliance.md](./06-nonfunctional-and-compliance.md)
8. [07-refund-and-quality-rules.md](./07-refund-and-quality-rules.md)
9. [08-admin-and-superadmin.md](./08-admin-and-superadmin.md)
10. [Implementation Plan](./implementation-plan/README.md) - Detailed implementation guide

## How to read / use these specs
- Start with **scope + glossary**: [00-overview.md](./00-overview.md)
- Understand **who can do what**: [01-personas-and-roles.md](./01-personas-and-roles.md)
- Follow the **end-to-end experiences** (viewer → owner → admin): [02-user-flows.md](./02-user-flows.md)
- Treat **functional requirements** as the build contract: [03-functional-requirements.md](./03-functional-requirements.md)
- Use the **data model** to guide schema and invariants: [04-data-model.md](./04-data-model.md)
- Use the **API outline** as OpenAPI-ready inventory: [05-api-spec-outline.md](./05-api-spec-outline.md)
- Use **NFR/compliance** for hard constraints: [06-nonfunctional-and-compliance.md](./06-nonfunctional-and-compliance.md)
- Use **refund rules** for deterministic, auditable behavior: [07-refund-and-quality-rules.md](./07-refund-and-quality-rules.md)
- Use **internal tooling spec** for support ops: [08-admin-and-superadmin.md](./08-admin-and-superadmin.md)
- Follow the **implementation plan** for build execution: [implementation-plan/README.md](./implementation-plan/README.md)

## Conventions
- **Scope tags** (used throughout):
  - **Core**: required for MVP
  - **Owner-only**: for individual camera-owner customers
  - **Association-only**: for associations/leagues operating multiple fields/teams
  - **Post-MVP**: explicitly deferred
- **Terminology**:
  - **Keyword / text code**: short code a viewer texts (e.g., `EAGLES22`).
  - **Payment link**: URL used to complete checkout.
  - **Watch link**: URL that boots the player after entitlement validation.
  - **Entitlement token**: signed, expiring token granting watch access.
- **Determinism**:
  - Refund decisions must be reproducible from stored telemetry summaries + the versioned rule set.
