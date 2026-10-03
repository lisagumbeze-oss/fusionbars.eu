# Production Storage Configuration Report

Date: 2026-10-02

Production control state: `PAUSED`

Final launch decision remains `LAUNCH_BLOCKED`. This closure did not change catalogue decisions, pricing, compliance, country eligibility, VAT, payment activation, email activation, legal documents, production secrets, shipping, or the launch state.

## Provider

| Item | Value |
| --- | --- |
| Selected provider family | S3-compatible object storage (`s3` or `cloudflare_r2`) |
| Implementation | `S3CompatibleObjectStorageProvider` behind the existing `ObjectStorageService` |
| Loaded environment | `development` |
| Loaded provider | `mock` |
| Loaded state | `TEST` |
| Production state for this configuration | `CONFIGURATION_REQUIRED` |
| Production-capable state | Not reached. `ACTIVE` was not reported. |

The mock provider remains the development and test provider. It is rejected as a production provider. No access key, secret, bucket name, endpoint, or token was invented, and no live bucket write was performed.

## Configuration

Loaded development variables, presence only:

| Variable | State |
| --- | --- |
| STORAGE_PROVIDER | INVALID |
| STORAGE_BUCKET | MISSING |
| STORAGE_ENDPOINT | MISSING |
| STORAGE_REGION | MISSING |
| STORAGE_CREDENTIALS | MISSING |

`INVALID` on the provider means the loaded value is `mock`. A production process with this configuration reports `CONFIGURATION_REQUIRED`. `ACTIVE` requires a supported provider, an HTTPS endpoint, a bucket, credentials that are present and not placeholders, environment separation, and a connectivity probe recorded as `PASS`.

`.env.example` still contains placeholders only. Real credentials were not written into source, the example file, logs, admin responses, health output, or this report.

## Private Storage

| Check | State |
| --- | --- |
| Payment evidence | Private namespace `private/proofs/`, visibility `PRIVATE` |
| Access control | Server-side. Owner, Finance, Order Manager, and Super Admin for payment proofs. Content and catalogue roles are refused. |
| Anonymous and guessed keys | Refused. A missing object and a forbidden object both return unauthorized, without a public existence leak from the download route. |
| Download | `GET /api/storage/private` after a session check. Unauthenticated requests return `401`. Unauthorized requests return `403`. |
| Signed URL | Presign lifetime is capped at 900 seconds. The protected route streams the object and does not publish a permanent public URL. |
| Cache | `Cache-Control: private, no-store` |
| Payment status | A stored proof can be submitted as `PAYMENT_SUBMITTED`. Upload does not set `PAYMENT_VERIFIED`. |
| Retention | `NOT_CONFIGURED`. No retention period was invented, and payment evidence is not auto-deleted. |
| Private storage readiness | `NOT_READY` until the provider state is `ACTIVE` |

## Public Media

| Check | State |
| --- | --- |
| Catalogue images | Separate `catalogue/public` and `catalogue/review` keys |
| Public delivery | `GET /api/media/catalogue` serves only media marked `PUBLIC` |
| Pending, rejected, test, and internal review | Not public |
| Publication | Storage does not publish a product. Audit Test Product remains `DO_NOT_PUBLISH`. |
| Next.js images | `images.remotePatterns` is empty. SVG execution is disabled. No wildcard remote host was added. |
| Public cache | Public catalogue responses may use `public, max-age=86400` |
| Public media readiness | `NOT_READY` until the provider state is `ACTIVE` |

The bucket is not made public in order to serve product images.

## Upload Security

Existing upload checks remain in force:

- Maximum size 5 MB
- MIME limited to JPEG, PNG, WebP, and PDF
- Extension allow-list
- Magic-byte check
- HTML, SVG, script, and other executable extensions rejected
- Path traversal rejected
- Catalogue images also require readable PNG or JPEG dimensions inside a safe bound
- Payment-proof filenames are replaced with unguessable keys. Email, raw filename, and the payment reference are not the object key.
- A failed object write returns `STORAGE_WRITE_FAILED` and does not record a successful submission

## Consistency

- A failed write does not create a successful storage reference.
- If indexing fails after a write, the object is deleted.
- Orphan detection reports an object without a reference, and a reference without an object, when listing is available.
- Ambiguous orphans are not auto-deleted.
- The S3 provider does not treat an empty list as proof that every object is missing. Listing stays unavailable until a real list operation exists.
- Payment-evidence retention stays `NOT_CONFIGURED`.

## Vercel

The S3-compatible provider uses `fetch` and Signature Version 4. Permanent uploads do not use the local disk. Development keeps the in-memory mock. Preview is not allowed to target a bucket marked `STORAGE_ENVIRONMENT=production`. Production rejects `mock`.

No production storage credentials were available to place in a Vercel environment. No bucket was created.

## Health and admin

`GET /api/health` reports storage as `CONFIGURATION_REQUIRED` for this environment. It does not include credentials, bucket names, or endpoints.

`GET /api/readiness` remains Super Admin only and adds the same safe storage report.

`/admin/system/launch` shows provider, state, private-storage readiness, public-media readiness, last test, and the first storage error. The connectivity action does not treat a mock write as production success. That screen was not clicked in a browser. Admin routes require a session, and no browser session was available.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | 219 passed, 0 failed |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |

The new storage test covers unauthorized reads, guessed keys, public URLs, rejected HTML and executable uploads, oversize and invalid MIME, public versus pending and rejected media, the role matrix, mock rejection in production, missing credentials, a connectivity probe that can reach `ACTIVE` only after a successful write/read/cleanup, failed-write rollback, and orphan reporting. The process restores the mock provider and `PAUSED` afterward.

## Other launch blockers

These were not changed:

- `SESSION_SECRET`, `AUTH_SECRET`, and `ORDER_LOOKUP_SECRET` remain `PRODUCTION_SECRET_TOO_WEAK`
- Object storage remains `CONFIGURATION_REQUIRED` for production
- Backups remain `BACKUP_CONFIGURATION_REQUIRED`
- Monitoring remains `NOT_CONFIGURED`
- Upstash rate-limit variables remain missing
- Email remains `REVIEW_REQUIRED`; SPF, DKIM, and DMARC remain `NOT_CONFIGURED`
- Bank transfer remains `TEST`; Bitcoin remains `TEST`; USDT and ETH remain `NOT_CONFIGURED`
- VAT remains `TAX_CONFIGURATION_REQUIRED`
- Legal company information remains `NOT_CONFIGURED`; required English policies remain unpublished
- No pilot product is approved for publication
- Loaded `SITE_URL` is not `https://fusionbars.eu`
- Browser, responsive, and accessibility screens were not inspected

## Production

`PAUSED`
