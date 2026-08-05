# Object storage via the Noctusoft relay

> **Status:** greenfield. FieldView stores **no** blobs today — there is no S3 /
> asset-upload code anywhere in the repo. This document is the standard to follow
> **when** asset storage is actually needed, so it lands on the relay from day
> one (same posture as email — see
> [`RELAY-CONNECT-HUB-MIGRATION.md`](./RELAY-CONNECT-HUB-MIGRATION.md)).
>
> **Existing dead config (2026-08):** the `ASSET_STORE=s3` var was removed from
> all api envs. The `AWS_REGION` / `AWS_S3_BUCKET` / `AWS_S3_ENDPOINT` /
> `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` vars are **injected by a Railway
> Bucket named `assets`** attached to the `api` service, and are read by **no**
> code. To fully retire them, detach/delete that bucket in the Railway dashboard
> (it appears unused; confirm it holds no objects first) — left in place for now
> because removing a storage resource is an owner decision, and the vars are
> inert at runtime.

## Why the relay, not direct S3

Same reasons email routes through the relay: **FieldView holds no vendor
credential**, and the **environment is the router**. The relay owns the
Cloudflare R2 credentials and enforces a per-bucket allowlist; FieldView just
`PUT`/`GET`s objects with its deploy key. Non-prod never touches prod blobs
because each environment writes to its **own bucket**.

## The endpoint

The relay exposes an R2-backed object store:

```
PUT  {NOCTUSOFT_RELAY_BASE_URL}/v1/storage/:bucket/<key…>
GET  {NOCTUSOFT_RELAY_BASE_URL}/v1/storage/:bucket/<key…>
```

- **Auth:** `Authorization: Bearer ${NOCTUSOFT_API_KEY}` (the Railway deploy key — works from any IP), exactly like `/email/send`.
- **Base URL:** `NOCTUSOFT_RELAY_BASE_URL` (= `https://api.noctusoft.com`).
- **Allowlist:** the relay only serves buckets in its `STORAGE_ALLOWED_BUCKETS`. A bucket not on the list is rejected — this is the guardrail that keeps environments from crossing.

## Per-environment buckets (the partitioning rule)

One bucket per environment. The **environment picks the bucket name**, so a dev
upload can never land in the prod bucket:

| Env | Bucket |
|---|---|
| dev | `fieldview-dev` |
| uat | `fieldview-uat` |
| production | `fieldview` |

Resolve the bucket from the same env resolver the email path uses
(`apps/api/src/lib/env.ts` → `resolveServerEnv()`), e.g.:

```ts
import { resolveServerEnv } from '../env';

const BUCKET = { dev: 'fieldview-dev', uat: 'fieldview-uat', production: 'fieldview' }[
  resolveServerEnv()
];
```

Unlike email — where a single `/email/send` handles all envs via the `X-App-Env`
header — storage keys the environment into the **bucket path**, because the blob
must be physically isolated (an object literally lives in one bucket or another).

## When you build this

1. Add `fieldview-dev`, `fieldview-uat`, `fieldview` to the relay's
   `STORAGE_ALLOWED_BUCKETS` (create the R2 buckets first).
2. Add a small `RelayStorage` client in `apps/api` mirroring `RelayEmailProvider`
   — `NOCTUSOFT_RELAY_BASE_URL` + `NOCTUSOFT_API_KEY`, bucket from
   `resolveServerEnv()`, throw on non-2xx.
3. Never add `AWS_*` / `S3_*` / `ASSET_STORE` vars back to FieldView — the relay
   holds all storage credentials.
