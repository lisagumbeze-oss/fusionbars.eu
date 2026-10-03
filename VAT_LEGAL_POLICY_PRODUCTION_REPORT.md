# VAT, tax, legal business information, and required policies

Production control state: `PAUSED`

Launch decision: `LAUNCH_BLOCKED`

This closure adds the approval and publication mechanism. It does not supply a VAT rate, a tax jurisdiction, a legal entity, or legal wording. No verified business input was provided, so no tax rate and no legal document is production-approved.

## Tax

| Item | Live state |
| --- | --- |
| Jurisdiction | `NOT_CONFIGURED` (no jurisdiction record) |
| Tax classes | `STANDARD`, `REDUCED`, `ZERO`, `EXEMPT`, `SPECIAL`, `NOT_CONFIGURED` exist as choices. No product has an assigned class (`0` decisions). |
| Rates | none |
| Effective dates | none |
| Inclusive / exclusive mode | `NOT_CONFIGURED` |
| Shipping tax class | `NOT_CONFIGURED` |
| Readiness | `TAX_CONFIGURATION_REQUIRED` |

A finance draft is not active. `SUPER_ADMIN` must approve the rate and then confirm `ACTIVATE_TAX_RATE` before the tax engine can use it. An approved rate that is not activated still returns `TAX_CONFIGURATION_REQUIRED`. Expired and future rates are not applied. Missing configuration does not become zero tax.

Shipping prices are unchanged: Standard €15, Express €20, free standard from €300. Shipping tax is calculated by the tax engine from the shipping tax class. That class is `NOT_CONFIGURED`, so shipping tax stays `TAX_CONFIGURATION_REQUIRED`.

Order creation stores the tax jurisdiction, class, rate, taxable amount, tax amount, shipping tax, and configuration version on the order. Later rate changes do not rewrite that snapshot. In a production runtime, checkout throws `TAX_CONFIGURATION_REQUIRED` when merchandise tax or shipping tax is unconfigured.

Admin surfaces `/admin/tax` and `/admin/settings/tax` read the tax ledger. Both are empty of rates. `FINANCE_MANAGER` may draft. `SUPER_ADMIN` approves and activates. `CATALOG_MANAGER` can view commercial tax status and cannot write it. `CONTENT_MANAGER` and `CUSTOMER` have no tax write authority.

## Business information

| Field | State |
| --- | --- |
| Store display name | `CONFIGURED` — Fusion Mushroom Bars EU (existing store name, not a legal-entity approval) |
| Support email | `CONFIGURED` — `sales@fusionbars.eu` (existing support identity, not replaced) |
| Legal company name | `NOT_CONFIGURED` |
| Registration number | `NOT_CONFIGURED` |
| VAT number | `NOT_CONFIGURED` |
| Registered address | `NOT_CONFIGURED` |
| Jurisdiction | `NOT_CONFIGURED` |

A stored value does not become `APPROVED` or `PUBLISHED`. Publication of a legal field requires a prior approval, rationale, evidence reference, and the confirmation `PUBLISH_LEGAL_FIELD`. The public company page has no approved fields. Evidence storage keeps a reference, reviewer, date, and result. Private documents are not stored or shown.

## Legal documents

English copies exist as empty review records. German, French, Spanish, Italian, and Dutch copies are not created from the English record. Each locale needs its own approval. Fallback is off, so a missing translation is not presented as published.

| Document | Locale | Status | Version | Effective date |
| --- | --- | --- | --- | --- |
| Terms & Conditions | en | `REVIEW_REQUIRED` | 0 | none |
| Privacy Policy | en | `REVIEW_REQUIRED` | 0 | none |
| Cookie Policy | en | `REVIEW_REQUIRED` | 0 | none |
| Shipping Policy | en | `REVIEW_REQUIRED` | 0 | none |
| Refund / Cancellation Policy | en | `REVIEW_REQUIRED` | 0 | none |
| Payment Information | en | `REVIEW_REQUIRED` | 0 | none |
| Imprint / Company Information | en | `REVIEW_REQUIRED` | 0 | none |
| All seven types | de, fr, es, it, nl | `NOT_CONFIGURED` | — | none |

No document body was generated. Publication requires content, approval by `COMPLIANCE_MANAGER` or `SUPER_ADMIN`, a valid effective date, and the confirmation `PUBLISH_LEGAL_DOCUMENT`. `CONTENT_MANAGER` can draft and cannot approve. A new publication marks the previous published version `SUPERSEDED` and keeps it. Only `PUBLISHED` is public.

Cookie inventory remains the application keys already in use: session, admin session, consent, cart, currency preference, and wishlist. Analytics is `NOT_CONFIGURED`. Payment information stays unpublished while bank transfer and crypto are not production-active, so no bank details or wallet addresses are published. Refund text and imprint facts were not invented.

## Checkout

Tax display is `TAX_CONFIGURATION_REQUIRED`. The checkout total is merchandise and shipping. It is not a tax-settled total.

Policy acceptance records document type, version, locale, timestamp, and order reference, and only for a `PUBLISHED` document. Unpublished terms cannot be accepted. No terms version is published, so the order legal snapshot records terms as not published. The snapshot also keeps the tax configuration version captured at order time.

## Public storefront

The footer links only to published legal documents. There are none, so no legal document link is rendered. The company link is omitted while company fields are unpublished. Direct routes `/legal/company`, `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/shipping`, `/legal/refunds`, and `/legal/payment` stay available and show that the document or company facts are not published. Draft text is not in the page or its metadata. Unpublished legal pages are not indexable. The sitemap does not add unpublished legal URLs.

## Audit

Tax changes record jurisdiction, class, old and new status, rate, actor, role, rationale, evidence reference, and timestamp. Legal field and document actions record the same kind of metadata. Audit entries do not store document bodies or private files.

## Browser QA

`DEFERRED`

No browser session was available. The public legal pages, footer, and checkout were not clicked. This remains a launch blocker.

## Validation

| Check | Result |
| --- | --- |
| `npm test` | 225 passed, 0 failed |
| `npx tsc --noEmit` | passed |
| `npm run build` | passed (Next.js 16.3.6, 345 pages) |

## Other launch blockers

Unchanged by this closure:

- Signing secrets: `PRODUCTION_SECRET_TOO_WEAK`
- Object storage: `CONFIGURATION_REQUIRED` (loaded provider remains mock / `TEST`)
- Backups: `BACKUP_CONFIGURATION_REQUIRED`
- Monitoring: `NOT_CONFIGURED`
- Distributed rate limiting: `NOT_CONFIGURED`
- Email: `REVIEW_REQUIRED`; SPF, DKIM, and DMARC gates `NOT_CONFIGURED`; provider credential `INVALID`; controlled email test `NOT_RUN`
- Bank transfer: `TEST`; Bitcoin: `TEST`; USDT and ETH: `NOT_CONFIGURED`; crypto conversion: `CRYPTO_RATE_CONFIGURATION_REQUIRED`; production payment options: none; controlled payment test `NOT_RUN`
- VAT: `TAX_CONFIGURATION_REQUIRED`
- Legal company identity: `NOT_CONFIGURED`; required English policies unpublished
- Catalogue: no pilot product approved for publication
- Country eligibility: unresolved
- `GBP_LAUNCH_MODE`: `DISABLED_FOR_LAUNCH`
- Site origin is not the production `https://fusionbars.eu` host configuration
- Browser QA: `DEFERRED`

## Production

`PAUSED`

Payments, email, object storage, backups, monitoring, distributed rate limiting, production secrets, country eligibility, shipping rates, catalogue decisions, and production activation were not activated.
