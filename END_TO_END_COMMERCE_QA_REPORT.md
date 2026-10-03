# End-to-End Commerce QA

Phase 20 rehearsed the commerce and admin paths on isolated fixtures. Production stays `PAUSED`. No production payment method, legal document, or unresolved catalogue product was activated or published. Audit Test Product remains `DO_NOT_PUBLISH`.

No overall readiness score is calculated.

## Environment

The rehearsal used the connected development PostgreSQL database. There is no separate preview database in the environment. `prisma migrate status` first reported one applied migration and “Database schema is up to date” while `schema.prisma` was already ahead of `0_init`.

The gap was additive:

- `Customer.preferredCurrency`, email verification, and password-reset columns
- `Order.lookupToken`, `trackingNumber`, `carrierName`, `paymentReference`
- `OrderStatus` value `DRAFT`
- `OrderAddress.isDefault`
- import and raw-source tables from the current schema

`prisma db push` and `prisma migrate reset` were not used. A failed attempt with a byte-order mark was marked rolled back before any statement ran, then `npx prisma migrate deploy` applied `20261001231500_schema_parity`. After that, `Customer.preferredCurrency` is present.

No backup snapshot was available, so no restore was performed. No real customer payment evidence was uploaded. Mock email was used for the rehearsal handoff. The configured provider was not treated as delivered.

`SITE_URL` in the loaded environment is not `https://fusionbars.eu`.

## Storefront

| Check | State | Evidence |
| --- | --- | --- |
| en, de, fr, es, it, nl interface copy | PASS | Navigation, checkout, and total labels exist in each dictionary. |
| Published legal translations | NOT_CONFIGURED | Public legal links are empty. A dictionary fallback is not a published translation. |
| Browser navigation, search, and category clicks | DEFERRED | Those pages were not clicked. |
| Unpublished and Audit Test Product visibility | PASS | Audit Test Product stays `DO_NOT_PUBLISH` and is not publicly visible. A `fixture-rehearsal-bar` can become ready without publishing a real product. |

## Commerce

| Check | State | Evidence |
| --- | --- | --- |
| Server price and €15 standard shipping | PASS | Client unit price was ignored. Subtotal 2000, shipping 1500, total 3500. |
| Express €20 and free standard at €300 | PASS | Below €300 shipping stays 1500. At 30000 minor units standard shipping is 0. |
| GBP price | BLOCKED_BY_CONFIGURATION | No GBP price was invented. |
| Missing tax | PASS | `TAX_CONFIGURATION_REQUIRED`. Tax amount was not calculated. |
| Configured tax rate | NOT_CONFIGURED | No VAT rate or jurisdiction is configured. |
| Destination eligibility | PASS | A disabled destination and Audit Test Product block checkout. |
| Inventory reservation | PASS | The in-memory engine rejects a second reservation of the last unit. Release and commit stay non-negative. |
| Database inventory concurrency | DEFERRED | No competing database transactions were opened. |
| Multi-hub cart | PASS | Two required hubs return `MULTI_HUB_NOT_CONFIGURED`. Split orders stay off. |

## Payments

| Check | State | Evidence |
| --- | --- | --- |
| Production bank and crypto | NOT_CONFIGURED | Production options are empty. Bank and Bitcoin stay non-production. Conversion is `CRYPTO_RATE_CONFIGURATION_REQUIRED`. |
| Amount mismatch, duplicate reference, public proof, repeat verify | PASS | `AMOUNT_MISMATCH`, duplicate reference rejected, public URL rejected, second verify is idempotent. |
| Live wallet or bank activation | BLOCKED | Not attempted. |

## Orders

| Check | State | Evidence |
| --- | --- | --- |
| Canonical lifecycle | PASS | `PENDING_PAYMENT` through `DELIVERED` is allowed. `PENDING_PAYMENT` to `SHIPPED` is rejected. `PAYMENT_CONFIRMED` and `DISPATCHED` are absent. |
| Live database order insert | BLOCKED | Schema columns are present. Insert still fails `OrderItem_variantId_fkey` because fixture variants are not `ProductVariant` rows. The in-memory order is kept. |

Cancellation remains allowed before shipment. Refund remains allowed only after payment verification. Those rules were rechecked through `OrderStatusService`.

## Customers

Password hashing, forged and expired sessions, and invalid reset rejection remain in the security regression. A live registration against a real mailbox was not performed.

## Admin

Finance can verify payments and does not hold content publish. Compliance can write compliance and cannot verify payments. Content can write content and cannot verify payments. Order management can read orders. A customer cannot open admin payments or verify a payment. Product publication still requires the publication role and an explicit confirm. The rehearsal did not publish a real product.

## Governance

Unpublished legal documents stay out of public links. Analytics is `NOT_CONFIGURED`. Optional consent can be withdrawn. Necessary cookies stay necessary. The current legal shells were not published.

## Email

Template validation passed. A mock handoff returns success with status `SENT`, not `DELIVERED`. A duplicate delivery claim is rejected. Production email remains blocked: SPF, DKIM, and DMARC are not verified, and production is paused. Mock handoff is not delivery.

## Security

Forged session, expired session, customer admin access, open redirect, HTML upload, metadata URL, unsigned webhook, and secret scrubbing remain blocked. Client price and shipping do not set the order total.

## Infrastructure

`npx prisma generate` succeeded, and `npm run build` then completed. No development server was holding the query engine.

Backups are `BLOCKED_BY_BACKUP_CONFIGURATION`. No restore was claimed. Monitoring is `NOT_CONFIGURED`. Distributed rate limiting is `WARNING` while Upstash is missing. Object storage is still mock.

## Launch-blocker matrix

| Area | Check | State | Evidence | Required Action |
| --- | --- | --- | --- | --- |
| Database | Schema parity | PASS | Forward migration `20261001231500_schema_parity` applied. `preferredCurrency` exists. | Keep using `prisma migrate deploy`. |
| Database | Order persistence | BLOCKED | `OrderItem_variantId_fkey` rejects fixture variants that are not database rows. | Store catalogue variants before relying on database orders. |
| Secrets | Production strength | BLOCKED | `SESSION_SECRET`, `AUTH_SECRET`, and `ORDER_LOOKUP_SECRET` are `PRODUCTION_SECRET_TOO_WEAK`. | Replace them with distinct 32+ character values. Do not write the values into source. |
| Storage | Production bucket | NOT_CONFIGURED | Provider is mock. | Configure a private bucket. |
| Email | DNS and provider | BLOCKED | Production email is not active. SPF, DKIM, and DMARC are not verified. | Leave email inactive. |
| Payments | Production config | NOT_CONFIGURED | No production payment option. Crypto rate is not configured. | Do not activate live methods. |
| Legal | Company information | NOT_CONFIGURED | Company facts are missing and the required policies are unpublished. | Enter verified facts, then publish through the legal workflow. |
| Catalogue | Publication readiness | BLOCKED | The governed first 10 are not ready. Audit Test Product is `DO_NOT_PUBLISH`. | Do not publish unresolved products. |
| Shipping | Country and routing | WARNING | €15 / €20 / €300 behave as configured. Unresolved eligibility does not become allowed. Split hub carts are blocked. | Approve explicit country decisions before treating a destination as allowed. |
| Backups | Provider backup | BLOCKED_BY_BACKUP_CONFIGURATION | `BACKUP_PROVIDER` is unset. No restore was run. | Enable host backups, then rehearse a restore on a separate database. |
| Monitoring | External monitoring | NOT_CONFIGURED | No monitoring destination. | Set `MONITORING_DSN`. |
| Rate limiting | Distributed | WARNING | In-memory window only. | Set the Upstash variables for production. |
| Environment | Canonical URL | BLOCKED | Loaded `SITE_URL` is not `https://fusionbars.eu`. | Set the production host only in the production environment. |
| Build | Official build | PASS | `npm run build` completed: Prisma client generation and the Next.js production build. | None for the compile. The other blockers remain. |
| Tax | VAT | NOT_CONFIGURED | Missing tax returns `TAX_CONFIGURATION_REQUIRED`. | Configure an approved rate. Do not guess one. |

## Defects

### P0

- Session, auth, and order-lookup secrets are too weak.
- Object storage is mock.
- Backups are not configured.
- Production email DNS is not configured.
- Production payments are not configured.
- Legal company information and policies are unpublished.
- Loaded site URL is not the production canonical host.
- VAT is not configured. The application blocks a guess, and that block is correct.
- Catalogue publication is not ready. Audit Test Product stays unpublished.

### P1

- Database orders fail the variant foreign key and fall back to memory.
- Database inventory concurrency was not rehearsed.
- External monitoring is not configured.
- Distributed rate limiting is not configured.
- GBP checkout is not configured.

### P2

- Storefront clicks for homepage, search, and categories were not performed in a browser.

### P3

None recorded.

## Validation

- `npm test`: 216 passed, 0 failed
- `npx tsc --noEmit`: pass
- `npm run build`: pass. `prisma generate` completed, then the Next.js build, including `/api/health` and `/api/readiness`
- `npm audit`: 1 low finding, `esbuild@0.27.7` via Vite, GHSA-g7r4-m6w7-qqqr. The Vercel runtime is Next.js. No upgrade was applied.

## Production

`PAUSED`
