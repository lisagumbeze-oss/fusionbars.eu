# Final Launch Gate Report

Date: 2026-10-03

Application: Fusion Mushroom Bars EU

This is a readiness audit of the current tree and the configuration it loads. Production was not activated. No prices, VAT rates, legal facts, payment details, secrets, or catalogue decisions were created to change a gate.

## A. Final production state

`PAUSED`

The control constant and the in-memory launch session are both `PAUSED`.

## B. Final launch decision

`LAUNCH_BLOCKED`

The in-app evaluation returns `LAUNCH_BLOCKED`. Mandatory gates remain unresolved. `READY_FOR_ACTIVATION` does not apply.

## C. Remaining blockers

| Blocker | Current state | Why activation stays unavailable |
| --- | --- | --- |
| Signing secrets | `SESSION_SECRET`, `AUTH_SECRET`, and `ORDER_LOOKUP_SECRET` are `PRODUCTION_SECRET_TOO_WEAK`. Distinctness is `PASS`. | A weak signing secret cannot protect sessions or order lookup. |
| Object storage | Provider `mock`, state `TEST`. Bucket, endpoint, region, and credentials are `MISSING`. Private storage `NOT_READY`. Last storage test `NOT_RUN`. | Payment proofs have no production bucket. |
| Backups | Database family `neon`. `BACKUP_PROVIDER` is not a verified backup. Enabled `UNKNOWN`. Recovery copy `UNKNOWN`. PITR `NOT_CONFIGURED`. Encryption `UNKNOWN`. Retention `RETENTION_POLICY_NOT_CONFIGURED`. Restore `NOT_RUN`. RPO and RTO `NOT_CONFIGURED`. State `BACKUP_CONFIGURATION_REQUIRED`. | A host family is not a verified backup or restore. |
| Monitoring | Provider `none`. DSN `MISSING`. Webhook `MISSING`. State `NOT_CONFIGURED`. Test signal `NOT_RUN`. | Structured logs are not an external monitor. |
| Distributed rate limiting | Provider name `upstash`. URL `MISSING`. Token `MISSING`. Mode `IN_MEMORY_ONLY`. State `NOT_CONFIGURED`. Failure mode in code is `FAIL_CLOSED`. Connectivity `NOT_RUN`. | The local counter is not shared production enforcement. |
| Transactional email | Provider `resend`. Sender `Fusion Mushroom Bars EU <sales@fusionbars.eu>`, reply-to `sales@fusionbars.eu`. State `REVIEW_REQUIRED`. Credential presence `CONFIGURED`. This process did not repeat the provider HTTP check, so acceptance is `NOT_CHECKED` and domain verification is `NOT_CHECKED`. Controlled handoff and delivery are `NOT_RUN`. | Email cannot leave review without an accepted credential, a verified domain, and a controlled delivery test. |
| SPF / DKIM / DMARC | All three gates are `NOT_CONFIGURED`. | DNS authentication is not verified for the sender domain. |
| Bank transfer | State `TEST`. Verification `NOT_VERIFIED`. IBAN format `NOT_CONFIGURED`. BIC format `NOT_CONFIGURED`. Controlled test `NOT_RUN`. Production options: none. | No verified bank account is configured. No account number was invented. |
| Cryptocurrency | BTC `TEST`. USDT `NOT_CONFIGURED`. ETH `NOT_CONFIGURED`. Address verification `NOT_VERIFIED`. Network `NOT_CONFIGURED`. Asset approval `NOT_APPROVED`. Controlled tests `NOT_RUN`. | No approved wallet or network exists. |
| Crypto conversion | `CRYPTO_RATE_CONFIGURATION_REQUIRED` | No approved conversion rate exists. |
| VAT / tax | `TAX_CONFIGURATION_REQUIRED`. Display mode `NOT_CONFIGURED`. Shipping tax class `NOT_CONFIGURED`. Jurisdictions 0. Active rates 0. | Checkout must not invent a rate. The opened checkout shows `TAX_CONFIGURATION_REQUIRED`. |
| Legal identity | Legal name, registration number, VAT number, registered address, and jurisdiction are `NOT_CONFIGURED`. Display name and support email are `CONFIGURED` and are not a legal-entity approval. Public legal fields: none. | Company identity is unpublished. |
| Required policies | English terms, privacy, cookies, refunds, shipping, payment, and imprint are `REVIEW_REQUIRED`, version 0, effective date empty. Public links: 0. de/fr/es/it/nl have no approved translation. | Unpublished policies are not customer terms. |
| Launch catalogue | Set `FUSION-EU-001` version 1 is `DRAFT`. Selected 0. Ready 0. Blocked 9. Do not launch 1. Published 0. Publication candidates 0. | Nothing in the launch set is approved for sale. |
| EUR pricing | Approved commercial EUR prices 0. Deferred 9. Not applicable 1 (audit product). Commercial EUR versions 0. | Launch products have no approved EUR price. |
| Country eligibility | Intended countries 0. Unresolved products 10. | No destination has an explicit product approval. |
| Authenticated admin was inspected | Not a blocker after this recheck. | Recorded below. The other gates still block activation. |

The launch-cohort states requested as DRAFT / REVIEW_REQUIRED / PRICING_REVIEW_REQUIRED / READY / PUBLISHED are not the labels this catalogue uses. The actual cohort is:

| Slug | Readiness | Publication ledger |
| --- | --- | --- |
| a-box-of-10-fusion-gummies | `NOT_READY` | `NOT_PUBLISHED` |
| a-box-of-fusion-gummies | `NOT_READY` | `NOT_PUBLISHED` |
| audit-test-product | `DO_NOT_PUBLISH` | `NOT_PUBLISHED` |
| brain-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar | `NOT_READY` | `NOT_PUBLISHED` |
| fun-dip-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar | `NOT_READY` | `NOT_PUBLISHED` |
| fusion-100-bars-boutique-box | `NOT_READY` | `NOT_PUBLISHED` |
| fusion-bars-banana-chocolate | `NOT_READY` | `NOT_PUBLISHED` |
| fusion-bars-peanut-butter | `NOT_READY` | `NOT_PUBLISHED` |
| fusion-cactus-cooler-gummies | `NOT_READY` | `NOT_PUBLISHED` |
| fusion-cherry-lime-gummies | `NOT_READY` | `NOT_PUBLISHED` |

`Audit Test Product` remains `DO_NOT_PUBLISH`. It is absent from the public catalogue list.

A separate public catalogue of 10 products is still served and is eligible for the sitemap. Those products are outside this launch cohort. Their publication state was not changed.

## D. Resolved since Closure 09

- The configured admin account signed in. Dashboard, orders, catalogue, specialist review, pricing, payment verification, email settings, email delivery, legal documents, legal settings, launch control, and launch catalogue opened at 1440px. Dashboard, specialist review, payment verification, and launch control also opened at 768px and 390px. They stayed off the login page.
- Launch control, after sign-in, showed `PAUSED`, `LAUNCH_BLOCKED`, and “Activation stays unavailable while a mandatory gate is blocked, unconfigured, or deferred.”
- The in-app browser gate now records that public pages and a super-admin session were opened. It is a non-blocking warning. It does not clear the other gates.
- The deployed host `https://fusionbars.eu` answered. That contact is recorded under performance. It does not clear configuration gates.
- `npm test`, `npx tsc --noEmit`, and `npm run build` passed again on this tree. No new failing test was introduced.

Closure 09 URL, GBP control, footer currency mark, and admin login redirect fixes are still present in this tree.

## Gate table

| Gate | Status | Evidence | Blocking? |
| --- | --- | --- | --- |
| Database/schema | PASS | Live query found `Customer.preferredCurrency`. Database presence is `CONFIGURED`. | No |
| Order persistence | PASS | Suite test “Order Creation Pipeline” is included in the 226 passing tests. | No |
| Inventory concurrency | PASS | Suite test “Inventory Concurrency Safety” is included in the 226 passing tests. | No |
| Production secrets | BLOCKED | Three signing secrets are `PRODUCTION_SECRET_TOO_WEAK`. Distinctness `PASS`. Values were not printed. | Yes |
| Object storage | BLOCKED | Mock provider, state `TEST`, credentials `MISSING`, private storage `NOT_READY`, health check `NOT_RUN`. | Yes |
| Backups/recovery | BLOCKED | Neon family identified. Backup enabled, recovery copy, PITR, encryption, retention, and restore are unverified. State `BACKUP_CONFIGURATION_REQUIRED`. | Yes |
| Monitoring | BLOCKED | `NOT_CONFIGURED`. No DSN. Test signal `NOT_RUN`. | Yes |
| Distributed rate limiting | BLOCKED | `IN_MEMORY_ONLY`. Upstash URL and token `MISSING`. | Yes |
| Transactional email | BLOCKED | `REVIEW_REQUIRED`. Sender identity matches `sales@fusionbars.eu`. Provider acceptance was not re-checked in this process (`NOT_CHECKED`). Controlled test `NOT_RUN`. | Yes |
| SPF/DKIM/DMARC | BLOCKED | Each gate is `NOT_CONFIGURED`. | Yes |
| Bank transfer | BLOCKED | `TEST`. Format `NOT_CONFIGURED`. Not in production options. | Yes |
| Cryptocurrency | BLOCKED | BTC `TEST`. USDT and ETH `NOT_CONFIGURED`. No approved address or network. | Yes |
| Crypto conversion | BLOCKED | `CRYPTO_RATE_CONFIGURATION_REQUIRED` | Yes |
| VAT/tax | BLOCKED | `TAX_CONFIGURATION_REQUIRED`. Checkout text shows that state. | Yes |
| Legal identity | BLOCKED | Legal name, registration, VAT number, address, and jurisdiction are `NOT_CONFIGURED`. | Yes |
| Required policies | BLOCKED | Seven English documents are `REVIEW_REQUIRED` and unpublished. Other locales have no approved translation. | Yes |
| Launch catalogue | BLOCKED | Cohort 10: ready 0, published 0, do-not-publish 1, not ready 9. Launch set `DRAFT`, selected 0. | Yes |
| EUR pricing | BLOCKED | 0 approved EUR prices. 9 deferred. 1 not applicable. | Yes |
| Country eligibility | BLOCKED | 0 intended countries. 10 unresolved. DE on the public gummies product is `NOT_CONFIGURED` and not explicitly allowed. US store status is `DISABLED` with the customer message “We are unable to complete delivery to this destination at this time.” The browser did not select that blocked country, so the on-screen country flow is `NOT_TESTED`. | Yes |
| Shipping | PASS for the configured rates | EUR standard 1500, express 2000, free-shipping threshold 30000. DE quote returned those figures. Destination approval is a separate gate. | No |
| GBP disabled launch state | PASS | `GBP_LAUNCH_MODE` is `DISABLED_FOR_LAUNCH`. Local browser showed 0 British Pound controls, Euro prices, and no pound price on checkout. | No |
| Public browser QA | PASS | Local Edge pass on the current tree, listed below. | No |
| Authenticated admin QA | PASS for the configured super-admin session | Sign-in reached `/en/admin`. Listed interiors opened. A second, lower role was not available, so role-restricted comparison is `NOT_TESTED`. | No |
| Responsive QA | PASS with one note | Public pages at 1440, 768, and 390 measured 0px overflow. Admin pages at 768 and 390 measured 0px except launch control at 768px, which overflowed by 24px. | No |
| Accessibility smoke test | PARTIAL | Not a WCAG audit. Details below. | No |
| Production performance | MEASURED on the cached deployed host | Not a Lighthouse score. Details below. | No |

## Production URL

Loaded `SITE_URL` and `NEXT_PUBLIC_SITE_URL` are `https://fusionbars.eu`.

`customerAbsoluteUrl('/en/orders/lookup')` returns `https://fusionbars.eu/en/orders/lookup`. An absolute localhost input is rejected.

Sitemap entries are built from `https://fusionbars.eu` plus the English locale. Legal links are included only when a document is published. None are published, so the sitemap has no legal URLs. Robots allow `/` and disallow admin, account, cart, checkout, orders, track, and API paths. The robots sitemap directive is `https://fusionbars.eu/sitemap.xml`.

Email account and order-status links use `https://fusionbars.eu`.

Local browser: homepage, shop, gummies category, public gummies product, legal terms, company, order lookup, sitemap, and robots returned 200. Audit Test Product and Banana Chocolate returned 404. Search for “audit” did not show that product. Checkout showed `TAX_CONFIGURATION_REQUIRED`, Euro formatting, and no IBAN or wallet address.

The deployed homepage canonical in the fetched HTML is `https://fusionbars.eu`. That response was a Vercel cache hit. It still contains a British Pound control and an `€/£` mark. The current local tree does not render the British Pound control and uses an Euro footer mark. The cached deployment is older than this tree. Live DNS success is limited to the HTTP responses below. It is not a claim that today’s source is what the cache is serving.

## Public browser smoke

Local headless Edge against `http://localhost:3000` on this tree.

| Path | Status | Overflow at 1440 | Notes |
| --- | --- | --- | --- |
| `/en` | 200 | 0 | Hero heading rendered. British Pound button count 0. |
| `/en/shop` | 200 | 0 | Heading “European Artisan Collection”. |
| `/en/shop?category=gummies` | 200 | 0 | Heading “Gummies”. |
| `/en/products/fusion-mushroom-fruit-gummies` | 200 | 0 | Add to cart updated the bag. |
| `/en/products/audit-test-product` | 404 | 0 | Heading “404”. |
| `/en/products/fusion-bars-banana-chocolate` | 404 | 0 | Heading “404”. |
| `/en/cart` | 200 | 0 | Heading “Your Shopping Bag”. |
| `/en/checkout` | 200 | 0 | Tax state visible. No IBAN. No pound price. |
| `/en/legal/terms` | 200 | 0 | “Document not published”. |
| `/en/legal/company` | 200 | 0 | Company page opened. |
| `/en/orders/lookup` | 200 | 0 | Lookup form opened. A lookup was not submitted. |
| `/sitemap.xml` | 200 |  | |
| `/robots.txt` | 200 |  | |

Tablet homepage overflow 0. Mobile checkout overflow 0.

Console: three 404 resource failures and a development warning about a script tag inside a React render. No page exception was captured on the opened routes. The 404s match the unpublished product requests and the existing missing favicon behavior.

## Authenticated admin

A configured admin account exists in the local environment. The password was not printed and was not invented. Sign-in landed on `/en/admin` with heading “Operations dashboard”.

Opened at 1440px, all HTTP 200 and still authenticated:

- Operations dashboard
- Orders
- Catalogue operations
- Specialist review
- Commercial pricing
- Payment verification
- Email settings
- Email delivery
- Legal documents
- Legal settings
- Launch control
- Launch catalogue

At 768px and 390px, dashboard, specialist review, payment verification, and launch control returned 200 with the same headings. Launch control at 768px overflowed by 24px. The other measured admin widths overflowed by 0px.

No activation, publication, payment, email, or legal approval was submitted.

## Accessibility smoke

| Check | Result |
| --- | --- |
| Visible labels on admin login | PASS |
| Programmatic admin email and password labels | PASS |
| Checkout visible labels | PASS |
| Checkout programmatic label association | PARTIAL. Several fields remain adjacent text rather than `htmlFor`. |
| Search dialog Escape | PASS in this pass. Escape closed the dialog. |
| Focus visibility walk | NOT_TESTED in this pass. |
| Heading on each opened page | PASS. Each opened HTML page exposed an h1, including the 404 pages. |
| Readable checkout tax state | PASS. The text is `TAX_CONFIGURATION_REQUIRED`. |
| Contrast measurement | NOT_TESTED. No formal contrast tool was run. |
| WCAG certification | Not claimed. |

## Production performance

The live host was contacted.

| Request | Result | Time |
| --- | --- | --- |
| `https://fusionbars.eu` | 307 to `https://fusionbars.eu/en` | 1.001 s |
| `https://fusionbars.eu/en` | 200, Vercel cache HIT, `Age: 532000` | 0.732 s on the follow-up |
| `https://fusionbars.eu/sitemap.xml` | 200 | 0.430 s |
| `https://fusionbars.eu/robots.txt` | 200 | 0.509 s |
| `https://fusionbars.eu/en/products/audit-test-product` | 404 | 1.822 s |
| `https://fusionbars.eu/en/checkout` | 200 | 1.067 s |
| `https://fusionbars.eu/en/admin/login` | 200 | 1.805 s |

The homepage cache age is about 6.2 days, so these timings are edge-cache responses, not a cold measurement of this tree. No Lighthouse run was performed. Local development timings are not used as production evidence.

Failed live assets were not separately inventoried beyond the HTTP statuses above.

## Shipping and country cases

| Case | Result |
| --- | --- |
| DE shipping quote, subtotal 1000 cents, standard | Standard 1500, express 2000, threshold 30000 |
| US shipping quote | The shipping calculator still returned standard 1500. It does not itself decide country eligibility. |
| Public gummies product to DE | Store `ENABLED`. Product decision `NOT_CONFIGURED`. Not explicitly allowed. |
| Public gummies product to US | Store `DISABLED`. Fulfilment `UNAVAILABLE`. Customer message: “We are unable to complete delivery to this destination at this time.” |
| Audit Test Product to DE | Not explicitly allowed. Customer message: “This product is not currently available for your destination.” |
| Banana Chocolate to DE | `NOT_CONFIGURED`. Not explicitly allowed. |

## Currency

`EUR` is the launch currency. `GBP_LAUNCH_MODE` is `DISABLED_FOR_LAUNCH`. The local storefront did not offer a British Pound control and did not show a pound price at checkout. Currency switching does not add a second canonical host. The cached deployed HTML still shows the older British Pound control; that cache is not this tree.

Development checkout method codes remain `SEPA_IBAN` and `CRYPTO_BTC` because `NODE_ENV` is `development`. Production options are empty, so those test methods are not production options. No payment was activated and no customer payment was simulated.

## E. Validation

```text
npm test          PASSED 226, FAILED 0, 64133 ms
npx tsc --noEmit  PASSED, exit 0
npm run build     PASSED, exit 0, 63820 ms
```

No new failing test appeared in this run.

## F. Activation safety

- `PRODUCTION_ACTIVE` was not set. Activation still returns to `PAUSED` while any mandatory gate is unresolved.
- No production payment method was activated.
- No legal, tax, company, or price data was invented.
- No test credential, IBAN, wallet, API key, or secret was promoted or printed.
- Audit Test Product was not published and its state was not edited.
- Catalogue selection, country eligibility, shipping prices, and legal approvals were not changed.
