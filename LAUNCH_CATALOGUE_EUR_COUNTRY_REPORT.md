# Launch catalogue, EUR prices, and country eligibility

Production control state: `PAUSED`

Launch decision: `LAUNCH_BLOCKED`

Launch set `FUSION-EU-001` is version 1, state `DRAFT`. No product was selected, no price was entered, and no country was enabled by this closure. The saved first-ten specialist decisions were not rewritten.

## Launch catalogue

| State | Count |
| --- | --- |
| Selected | 0 |
| Fully ready | 0 |
| Blocked | 9 |
| Do not launch | 1 (`audit-test-product`) |
| Published | 0 |
| Publication candidates | 0 |

The first ten remain `NOT_SELECTED`. Being in the first review batch does not select them. `A Box of 10 Fusion Gummies` and `A Box of Fusion Gummies` stay separate products.

`Audit Test Product` stays `NON_COMMERCIAL_TEST_RECORD` and `DO_NOT_PUBLISH`. The launch service refuses `LAUNCH_SELECTED` for that slug.

Selecting a product records intent only. It does not publish, and it does not make the product purchasable. A publication candidate requires `LAUNCH_SELECTED` and `READY_FOR_PUBLICATION`, and `DO_NOT_PUBLISH` overrides both. Checkout still accepts only a publicly visible `PUBLISHED` product.

## EUR pricing

| State | Count |
| --- | --- |
| Specialist `PRICE_APPROVED` | 0 |
| Pending | 0 |
| `PRICE_DEFERRED` | 9 |
| `PRICE_NOT_APPLICABLE` | 1 (Audit Test Product) |
| Commercial EUR price versions | 0 |

No EUR amount was created. Source USD figures were not converted. GBP remains `DISABLED_FOR_LAUNCH`. There is no action to convert all USD prices or to apply one EUR amount to every product. The pricing screen can filter to `scope=launch`; with nothing selected, that filter is empty.

## Country eligibility

| State | Count |
| --- | --- |
| Intended launch destinations | 0 (`NOT_CONFIGURED`) |
| Products with unresolved country eligibility | 10 |

`ALLOWED`, `RESTRICTED`, `BLOCKED`, `DEFERRED`, and `NOT_CONFIGURED` remain explicit decisions. `DEFERRED` and `NOT_CONFIGURED` do not allow checkout. A compliance state of `DEFERRED`, `REJECTED`, or `DO_NOT_PUBLISH` still blocks a destination even if a country row says `ALLOWED`. There is no allow-all-Europe action. The launch view is `/admin/shipping/product-eligibility?scope=launch`.

## Compliance

| State | Count |
| --- | --- |
| Approved | 0 |
| Deferred | 9 |
| Rejected | 0 |
| Do not publish | 1 |

## Content

| State | Count |
| --- | --- |
| Approved | 0 |
| Pending | 9 |
| Restricted / do not publish | 1 |

Internal source text was not promoted to public copy.

## Translation

Launch locale policy: `NOT_CONFIGURED`

English, German, French, Spanish, Italian, and Dutch are still the store locales. None was marked required or optional for launch. English-first was not assumed. A translation is not approved without a reviewer action.

## Tax

`TAX_CONFIGURATION_REQUIRED`

No tax class was inferred. A missing rate is not treated as zero tax. This uses the tax ledger from the legal/tax closure and does not change it.

## Shipping

Launch destinations: none.

Standard €15, Express €20, and free standard from €300 are unchanged. No new route was created. Until a destination is named and a product is explicitly eligible, the shipping checklist stays `NOT_CONFIGURED`.

## Publication

Ready for publication: 0

Published: 0

Example, Fusion Bars — Banana Chocolate: launch status `BLOCKED`, selection `NOT_SELECTED`. Blocking rows from the saved record and the current tax, shipping, and legal gates:

- Pricing `PRICE_DEFERRED`
- Compliance `DEFERRED`
- Country `NOT_CONFIGURED`
- Content `CONTENT_DEFERRED`
- Translation `NOT_CONFIGURED`
- Tax `TAX_CONFIGURATION_REQUIRED`
- Shipping `NOT_CONFIGURED`
- Legal `REVIEW_REQUIRED`
- Publication `NOT_READY`

## Audit

Launch-set history: 0 live events. The mechanism records product, decision, old state, new state, reviewer, role, timestamp, evidence reference, and launch-set version. Approving the launch set requires a super admin, confirmation, evidence, a commercial policy reference, an explicit locale policy, and named destinations. Approval does not publish the set.

## Browser QA

`DEFERRED`

Product pages, prices, add-to-cart, country selection, checkout, and public visibility were not opened in a browser. This remains a launch blocker.

## Validation

| Check | Result |
| --- | --- |
| `npm test` | 226 passed, 0 failed |
| `npx tsc --noEmit` | passed |
| `npm run build` | passed (Next.js 16.3.6, 357 pages) |

## Other launch blockers

Unchanged:

- Signing secrets: `PRODUCTION_SECRET_TOO_WEAK`
- Object storage: `CONFIGURATION_REQUIRED`
- Backups: `BACKUP_CONFIGURATION_REQUIRED`
- Monitoring: `NOT_CONFIGURED`
- Distributed rate limiting: `NOT_CONFIGURED`
- Email: `REVIEW_REQUIRED`; controlled email test `NOT_RUN`
- Bank transfer: `TEST`; Bitcoin: `TEST`; USDT and ETH: `NOT_CONFIGURED`; crypto conversion: `CRYPTO_RATE_CONFIGURATION_REQUIRED`
- VAT: `TAX_CONFIGURATION_REQUIRED`
- Legal company identity: `NOT_CONFIGURED`; required English policies unpublished
- Catalogue: no pilot product approved for publication; launch set `DRAFT` with 0 selected
- Country eligibility: unresolved
- `GBP_LAUNCH_MODE`: `DISABLED_FOR_LAUNCH`
- Browser QA: `DEFERRED`

## Production

`PAUSED`

Payments, email, and production activation were not turned on.
