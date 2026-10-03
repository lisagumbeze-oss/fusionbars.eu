# Legal, Compliance and Storefront Governance Report

Date: 2026-10-01

Production: **PAUSED**

No legal company name, registration number, VAT number, address, jurisdiction, refund rule, or regulatory approval was invented. Email DNS was not changed: SPF, DKIM, and DMARC remain `NOT_CONFIGURED`, and email production remains blocked.

## Business Information

| Field | State |
| --- | --- |
| Store display name | `CONFIGURED` — existing store name, not approved as the legal entity |
| Support email | `CONFIGURED` — `sales@fusionbars.eu` |
| Legal company name | `NOT_CONFIGURED` |
| Registration number | `NOT_CONFIGURED` |
| VAT number | `NOT_CONFIGURED` |
| Registered address | `NOT_CONFIGURED` |
| Jurisdiction | `NOT_CONFIGURED` |

Configured does not mean approved for public disclosure. The public company page stays empty until a compliance role approves a configured field.

## Legal Documents

English shells exist. They are not approved translations, and the other five locales do not have documents.

| Document | Locale | Status | Version | Effective date |
| --- | --- | --- | --- | --- |
| Terms | en | `REVIEW_REQUIRED` | 0 | none |
| Privacy | en | `REVIEW_REQUIRED` | 0 | none |
| Cookies | en | `REVIEW_REQUIRED` | 0 | none |
| Refunds | en | `REVIEW_REQUIRED` | 0 | none |
| Shipping | en | `REVIEW_REQUIRED` | 0 | none |
| Payment | en | `REVIEW_REQUIRED` | 0 | none |
| Imprint | en | `REVIEW_REQUIRED` | 0 | none |

A content editor can draft text. Approval requires Compliance or Super Admin. Publication requires a separate confirmation. The previous version is kept as `SUPERSEDED`. Drafts are not linked in the footer or sitemap. An unpublished page says the document is not published and is marked `noindex`.

Operational shipping facts remain the existing configuration: standard €15, express €20, free standard shipping from €300, discreet packaging, hubs in the Netherlands, Spain, Germany, and France, no public carrier tracking, and no age check at delivery. Those facts are not an approved shipping policy.

No payment method is production-active, so the payment document does not list a live bank account or wallet.

## Privacy / Cookies

- Consent can record necessary, preferences, analytics, and marketing. Necessary storage cannot be turned off by withdrawing optional categories.
- Cookie inventory records the session cookie, admin session cookie, consent key, cart storage, currency preference, and wishlist. Currency and wishlist are optional. No third-party tracker was found.
- Analytics: `NOT_CONFIGURED`. No analytics script was added.
- Newsletter templates exist. Newsletter delivery is `NOT_ACTIVE` because production email is not active. The form does not say a marketing email was sent.
- Contact submission does not say the support desk received the message while email production is blocked.

## Content Governance

Public product text still depends on the existing content approval gate. Imported source text and staged reviews are not published by this phase. Sensitive wording such as cure or disease language can be flagged `REQUIRES_REVIEW`. That flag is not a legal or illegal determination. No catalogue-wide claim decision was written.

## Compliance

The compliance page lists legal blockers as workflow states. It does not assign a safe or unsafe score. Existing specialist compliance, country, and publication decisions were not changed.

## Country Governance

Destination messages stay neutral. The public result does not include reviewer, evidence, or rationale. Pilot country decisions were not modified.

## Public Storefront

- Unpublished legal documents are omitted from the footer and sitemap.
- Unpublished products stay out of the public catalogue and structured-data path already enforced by publication readiness.
- Admin, account, cart, checkout, order, and API routes stay disallowed in `robots.txt`.
- An open claim review blocks that product in the existing publication readiness service.
- Checkout records a terms version only after a published terms document exists. It does not ask the customer to accept an unpublished draft.

## Launch Blockers

- Legal company name is `NOT_CONFIGURED`
- Terms are not published
- Privacy policy is not published
- Cookie policy is not published
- Shipping policy is not published
- Refund policy is not published
- Payment disclosure is not published
- Production is `PAUSED`
- Email production remains blocked, with SPF, DKIM, and DMARC `NOT_CONFIGURED`

## Validation

- `npm test`: 214 passed, 0 failed
- `npx tsc --noEmit`: passed
- `npm run build`: passed. Prisma Client generated and the Next.js build completed, including `/admin/legal`, `/admin/settings/legal`, and `/legal/company`.

The previous email baseline of 213 passed tests was not regressed.

Admin legal screens require a login, so they were not clicked in a browser.

## Production

`PAUSED`
