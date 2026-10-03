# Final Launch Readiness Report

Date: 2026-10-02

## Executive State

Production control state: `PAUSED`

Final decision: `LAUNCH_BLOCKED`

`PRODUCTION_ACTIVE` was not set. A Super Admin confirmation was exercised against the current gates and was refused. The confirmation screen copy is hidden while the decision remains `LAUNCH_BLOCKED`.

Mandatory blockers that remain:

- `SESSION_SECRET`, `AUTH_SECRET`, and `ORDER_LOOKUP_SECRET` are `PRODUCTION_SECRET_TOO_WEAK`
- Object storage is still the mock provider (`CONFIGURATION_REQUIRED`)
- Backups are `BACKUP_CONFIGURATION_REQUIRED`; no restore rehearsal was run
- Monitoring is `NOT_CONFIGURED`
- Distributed rate limiting is missing (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are `MISSING`)
- Email is `REVIEW_REQUIRED`; SPF, DKIM, and DMARC are `NOT_CONFIGURED`; no controlled send was run
- Bank transfer is `TEST`; Bitcoin is `TEST`; USDT and ETH are `NOT_CONFIGURED`; production payment options are empty
- VAT is `TAX_CONFIGURATION_REQUIRED`
- Legal company name is `NOT_CONFIGURED`; required English policies are not published
- No pilot product is approved for publication
- Loaded `SITE_URL` is not `https://fusionbars.eu`
- Browser, responsive, and accessibility screens were not inspected

Warnings that stay warnings:

- In-memory rate limiting still works for a single process. It is not a production limiter.
- Country eligibility is unresolved unless an explicit product decision exists.
- EUR checkout math is implemented. The first ten products do not have approved EUR selling prices.

Deferred:

- Browser clicks for the public site and admin
- Responsive and accessibility inspection
- Performance timings
- A restore onto a separate database
- A controlled monitoring signal
- A controlled email delivery
- A live payment proof

GBP is explicitly `DISABLED_FOR_LAUNCH`. No GBP selling price was invented. The pricing engine still rejects a missing GBP price when GBP is requested.

## Database

`npx prisma migrate status` against the configured direct connection, after raising the connect timeout for a cold database:

- Database name: `neondb`
- Migrations found: 2
- Result: `Database schema is up to date`
- `prisma migrate reset` was not run
- `prisma db push` was not used

The first status attempt timed out before the database responded. The retry completed. The hostname is not recorded here.

Schema parity from the earlier forward migration remains in place, including `Customer.preferredCurrency`. This status means the migration files are applied. It does not by itself prove every catalogue row exists.

### Order persistence

The previous failure was `OrderItem_variantId_fkey`. Checkout variant ids such as `var_bar_1` existed in the catalogue file and not as `ProductVariant` rows. The foreign key was not removed.

`OrderDatabasePersistence` now represents a catalogue variant with its existing id, SKU, and catalogue EUR/GBP amounts, stores the product as `DRAFT`, and then commits the order, address, line item, and payment in one transaction. The line item connects to that variant. Stock is claimed with a conditional update. If the claim fails, the order transaction rolls back.

An isolated rehearsal on the connected PostgreSQL database returned:

- `persisted: true`
- `rolledBack: true`
- `concurrentWins: 1`

The rehearsal order was deleted. No rehearsal row remains for the fixture guest address. A failed reservation of 100000 units left no order row. Production `saveOrder` deletes the in-memory order and throws if the database is unavailable or the transaction fails. Development tests still keep the in-memory order when `NODE_ENV` is not `production`, so the suite does not depend on a live write.

### Inventory concurrency

Two concurrent transactions reserved the last unit of a fixture variant created for the test. One commit succeeded. The fixture product was deleted. Negative stock rows after the rehearsal: 0. This was not accepted from the in-memory reservation engine. That engine still passes its own separate check.

### Integrity counts

Read-only counts after the rehearsal:

- Product variants: 1 (the represented catalogue variant)
- Orders present: 3
- Rehearsal orders remaining: 0
- Concurrency fixtures remaining: 0
- Negative on-hand or reserved rows: 0

The three existing orders were not modified and were not classified further. No ambiguous rows were auto-corrected.

## Security

| Check | State |
| --- | --- |
| Session, auth, and order-lookup secrets | `PRODUCTION_SECRET_TOO_WEAK` |
| Database URL and direct URL | `CONFIGURED` (values not shown) |
| Email provider key | `CONFIGURED` (value not shown) |
| Distinct 32+ character production secrets | Not replaced. Nothing was generated or written into the repo. |
| RBAC activation | `CUSTOMER`, `CONTENT_MANAGER`, `CATALOG_MANAGER`, `FINANCE_MANAGER`, and `COMPLIANCE_MANAGER` cannot activate production |
| Super Admin without the confirmation phrase | Refused |
| Super Admin with `Confirm Production Activation` | Refused while a mandatory gate is unresolved. An audit entry records the refusal. |
| `PAUSE PRODUCTION` | Returns `PAUSED` and does not delete orders |
| Distributed rate limit | `MISSING` |
| Security regression | The existing suite passed, including forged session, price, tax, shipping, publication, lookup, redirect, upload, webhook, duplicate payment, and duplicate email cases |

## Commerce

- VAT: `TAX_CONFIGURATION_REQUIRED`. No rate was entered.
- EUR: server prices are used. The first ten have no approved EUR selling price.
- GBP: `DISABLED_FOR_LAUNCH`
- Shipping rates in code: standard 1500, express 2000, free standard from 30000 minor EUR units
- Split-hub carts remain `MULTI_HUB_NOT_CONFIGURED`
- Unresolved product eligibility does not become allowed

## Payments

- Bank: `TEST` with placeholder credentials. Not a production option.
- BTC: `TEST`. Not a production option.
- USDT: `NOT_CONFIGURED`
- ETH: `NOT_CONFIGURED`
- Crypto conversion: `CRYPTO_RATE_CONFIGURATION_REQUIRED`
- Production options: none
- No bank details or wallet addresses were invented
- No live payment was marked successful

## Email

- Provider: `resend`
- State: `REVIEW_REQUIRED`
- Sender remains `sales@fusionbars.eu`
- SPF: `NOT_CONFIGURED`
- DKIM: `NOT_CONFIGURED`
- DMARC: `NOT_CONFIGURED`
- Controlled test: `NOT_RUN`
- Delivery: not claimed. `SENT` was not treated as `DELIVERED`.
- Email stays inactive

## Legal

- Legal company name, registration, address, jurisdiction, and VAT number were not invented
- Company name gate: `NOT_CONFIGURED`
- Terms, privacy, cookies, shipping, refunds, and payment documents are not published
- Other locales do not inherit a published English document
- No legal shell was marked approved or published
- Cookie and consent behaviour from the legal phase is unchanged
- Public legal pages for unpublished documents stay unpublished

## Catalogue

No launch product was approved in this phase. The first ten were not modified.

Specialist states:

| Product | Pricing | Compliance | Content | Countries |
| --- | --- | --- | --- | --- |
| a-box-of-10-fusion-gummies | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |
| a-box-of-fusion-gummies | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |
| audit-test-product | PRICE_NOT_APPLICABLE | DO_NOT_PUBLISH | DO_NOT_PUBLISH | none |
| brain-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |
| fun-dip-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |
| fusion-100-bars-boutique-box | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |
| fusion-bars-banana-chocolate | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |
| fusion-bars-peanut-butter | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |
| fusion-cactus-cooler-gummies | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |
| fusion-cherry-lime-gummies | PRICE_DEFERRED | DEFERRED | CONTENT_DEFERRED | none |

Audit Test Product remains `DO_NOT_PUBLISH` in the publication readiness service. The saved first-batch summary still says `NOT_READY` for that row's publication field. Neither state publishes it.

The represented checkout variant `var_bar_1` was stored as a draft database product so orders can reference it. That row is not a publication approval.

## Country

Store destinations were not newly enabled. Product country lists for the first ten are empty. Unresolved eligibility stays unresolved. US, and the other store-disabled destinations, stay disabled. No country was launched because it exists in the registry.

## Infrastructure

- Storage: mock / `CONFIGURATION_REQUIRED`. Payment evidence is not on a production private bucket.
- Backups: `BACKUP_CONFIGURATION_REQUIRED`. A documented procedure was not counted as a backup. No restore onto a second database was performed.
- Monitoring: `NOT_CONFIGURED`. Structured logs were not treated as an external monitor. No controlled error signal was sent.
- Canonical URL: loaded `SITE_URL` is not `https://fusionbars.eu`. The sitemap and robots file hardcode `https://fusionbars.eu`. Password reset, verification, and order links that read `SITE_URL` do not yet use that host.
- Robots disallow admin, account, cart, checkout, orders, track, and API paths, including locale-prefixed copies.
- Deployment was not activated.

## Browser QA

Not performed. Homepage, navigation, search, category, product, cart, checkout, legal, locale, currency, and the admin screens were not clicked. Desktop, tablet, and mobile were not inspected. Keyboard, label, focus, and dialog behaviour was not inspected. This is `DEFERRED`, and it blocks go-live. No cosmetic defect list was invented from screens that were not opened. No accessibility certification is claimed.

Performance timings were not captured. No late architectural change was made for speed.

## Dependency Audit

`npm audit`: 1 low finding.

- Package: `esbuild@0.27.7`
- Advisory: GHSA-g7r4-m6w7-qqqr, Windows development-server file read
- Direct dependency: `esbuild` in devDependencies, range `^0.27.0`
- Also used by `vite@8.3.1`
- `tsx` depends on `esbuild@0.28.2`, which is outside the affected range
- Production Next.js runtime does not serve the Vite/esbuild dev server
- Decision: accepted for this launch audit. Not upgraded, because clearing the finding would move Vite's esbuild without a production runtime defect

## Validation

- `npm test`: 217 passed, 0 failed
- `npx tsc --noEmit`: pass
- `npm run build`: pass (`prisma generate`, then `next build`, exit 0). Includes `/api/health` and `/api/readiness`
- `npm audit`: 1 low, as above

## Final Launch Table

| Area | Requirement | State | Evidence | Blocking? | Action |
| --- | --- | --- | --- | --- | --- |
| Database | Schema parity | READY | 2 migrations applied. Status reports up to date. | No | Keep migrate deploy. Do not db push or reset. |
| Database | Orders persist | READY | Isolated order committed, invalid reservation rolled back, rehearsal row removed. | No | Keep the transactional path on production saves. |
| Secrets | Strong secrets | BLOCKED | Three secrets are PRODUCTION_SECRET_TOO_WEAK. Values not shown. | Yes | Replace them outside the repo with distinct 32+ character values. |
| Storage | Production bucket | NOT_CONFIGURED | Storage provider is mock. | Yes | Configure private production storage. |
| Backups | Provider backup | BLOCKED | BACKUP_CONFIGURATION_REQUIRED. No restore. | Yes | Enable provider backups and restore to a separate database. |
| Monitoring | External monitor | NOT_CONFIGURED | No DSN or webhook. | Yes | Configure a monitor and send one controlled signal. |
| Rate limiting | Distributed | WARNING | Upstash URL and token are MISSING. | Yes | Configure the distributed limiter before a Vercel production deployment. |
| Email | Provider | BLOCKED | resend, state REVIEW_REQUIRED, test NOT_RUN. | Yes | Finish provider verification and a controlled test. |
| Email | SPF | NOT_CONFIGURED | DNS status NOT_CONFIGURED. | Yes | Verify SPF. |
| Email | DKIM | NOT_CONFIGURED | DNS status NOT_CONFIGURED. | Yes | Verify DKIM. |
| Email | DMARC | NOT_CONFIGURED | DNS status NOT_CONFIGURED. | Yes | Verify DMARC. |
| Payments | Bank | NOT_CONFIGURED | State TEST. No production option. | Yes | Enter verified bank details or explicitly disable bank transfer. |
| Payments | Crypto | NOT_CONFIGURED | BTC TEST. Conversion unconfigured. | Yes | Enter an approved wallet and rate, or explicitly disable crypto. |
| Tax | VAT | NOT_CONFIGURED | TAX_CONFIGURATION_REQUIRED. | Yes | Enter an approved jurisdiction, class, rate, and date. |
| Currency | EUR | WARNING | Server EUR math exists. First ten prices are not approved. | Yes | Approve an EUR price for each launch product. |
| Currency | GBP | DISABLED_FOR_LAUNCH | Explicit launch policy. No price invented. | No | Leave GBP out of the first launch. |
| Legal | Company info | NOT_CONFIGURED | Legal name is not configured. | Yes | Enter verified company facts. |
| Legal | Required policies | NOT_CONFIGURED | Six English policies are unpublished. | Yes | Approve and publish the required documents. |
| Catalogue | Launch products | BLOCKED | 9 deferred, 1 do-not-publish, 0 published. | Yes | Publish only products that pass every gate. |
| Country | Eligibility | WARNING | First ten have no country decisions. | Yes | Record eligibility for each destination that will be sold. |
| Shipping | Routes/methods | WARNING | EUR 15 / 20 / 300. Disabled destinations stay blocked. | No | Keep the rates. Approve destinations separately. |
| Security | High-risk tests | READY | Suite regression passed. Secrets themselves remain blocked above. | No | Keep the regression suite. |
| Browser | Public QA | DEFERRED | Screens were not opened or clicked. | Yes | Inspect public and admin flows, including small screens. |
| Build | Official build | READY | npm run build exit 0 after prisma generate. | No | Repeat on the production release commit. |

Activation stays unavailable. The launch control page no longer starts from an uninspected pass list. Those 24 rows are `NOT_TESTED`. The final gate panel shows `LAUNCH_BLOCKED` and does not show the activation confirmation copy.

## Go-live rule

A mandatory `BLOCKED`, `NOT_CONFIGURED`, or unresolved critical defect prevents activation. Warnings above that are marked blocking were not converted to ready. `READY_TO_LAUNCH` was not reached. `PRODUCTION_ACTIVE` did not occur.

### `LAUNCH_BLOCKED`
