# Production Browser, Responsive, and Accessibility Report

Date: 2026-10-03

Production control state: `PAUSED`

Launch decision: `LAUNCH_BLOCKED`

Browser used: headless Microsoft Edge, driven by Playwright, against the local development server at `http://localhost:3000`. Pages below were opened and exercised in that browser. A live request to `https://fusionbars.eu` was not made, so DNS and the deployed host were not inspected.

This is a practical smoke test. It is not a WCAG certification, a contrast audit, or a production performance score.

## Production URL

| Check | Result |
| --- | --- |
| Loaded `SITE_URL` | `https://fusionbars.eu` |
| Loaded `NEXT_PUBLIC_SITE_URL` | `https://fusionbars.eu` |
| `NODE_ENV` in the local environment | `development` |
| `APP_URL` | `http://localhost:3000` (unused by application source) |
| Canonical host in rendered metadata | `https://fusionbars.eu` |
| `.env.example` | Already documented `https://fusionbars.eu`. Left unchanged. |

The local environment now loads the canonical site URL. Production mode still forces `https://fusionbars.eu` when a configured value is localhost, a private address, or `http://`. Customer absolute URLs are built from that origin. A path that already contains a scheme or `localhost` is rejected.

Checked customer URL consumers:

- Homepage canonical: `https://fusionbars.eu/en`
- Product canonical: `https://fusionbars.eu/en/products/fusion-mushroom-fruit-gummies`
- Shop/category page is served at `/en/shop?category=gummies` and does not emit a second canonical host
- Legal terms canonical: `https://fusionbars.eu/en/legal/terms`
- Company page canonical: `https://fusionbars.eu/en/legal/company`
- Sitemap document and every `<loc>`: `https://fusionbars.eu`
- Robots sitemap line: `https://fusionbars.eu/sitemap.xml`
- Email base URL, account links, and order-status links: `https://fusionbars.eu`
- Open Graph and structured product URLs use the same origin

No customer HTML body from the opened public pages contained `localhost:3000` or `http://fusionbars.eu`. Public links are not built from the browser `Host` header.

Currency switching does not create a second canonical URL. With British Pound launch mode `DISABLED_FOR_LAUNCH`, the storefront renders the Euro control and does not render the British Pound control.

## Sitemap

Fetched `GET /sitemap.xml` → 200.

The document uses `https://fusionbars.eu` for every URL. The URLs present are the English homepage, shop, contact, and publicly visible product pages. The response does not include `/admin`, `/account`, `/cart`, `/checkout`, order lookup, internal review routes, `audit-test-product`, or `fusion-bars-banana-chocolate`. No legal URLs are present, which matches the current state that no legal document is published.

## Robots

Fetched `GET /robots.txt` → 200.

`Allow: /` remains in place, so the public storefront is crawlable. Disallow covers `/admin/`, `/account/`, `/cart/`, `/checkout/`, `/orders/`, `/track/`, `/api/`, and the same paths under a locale prefix. The sitemap directive points at `https://fusionbars.eu/sitemap.xml`.

## Public Browser

All of these were opened in Edge.

| Screen | Result | Evidence |
| --- | --- | --- |
| Homepage | PASS | HTTP 200. Heading “Gourmet Belgian Cacao. Precision Mycology.” Navigation, hero, product image, Euro control, language control, and footer rendered. Measured horizontal overflow at 1440px: 0. |
| Navigation | PASS | Desktop links visible at 1440px. Mobile menu control opened “Shop Collection” at 390px after hydration. Language combobox present. Euro control present. British Pound control absent. |
| Search | PASS | Search dialog opened. Query `zzzz-no-such-product` showed “No products found matching”. Query `audit` returned 0 results. Query `gummies` exposed a result link to `/en/products/fusion-mushroom-fruit-gummies`. Escape closed the dialog. |
| Category | PASS | `GET /en/shop?category=gummies` → 200. The public gummies product is in the HTML. `audit-test-product` and `fusion-bars-banana-chocolate` are absent. |
| Product | PASS | Public gummies page HTTP 200. Title, Euro price, image, and add-to-cart rendered. Image alt: “Fusion Mushroom Fruit Pectin Gummies (4g) - Berry Citrus”. Broken images on that page: 0. No dollar commercial price in the rendered text. |
| Unpublished product | PASS | `GET /en/products/fusion-bars-banana-chocolate` → 404. Rendered text did not include review notes, compliance notes, or source content. |
| Audit Test Product | PASS | `GET /en/products/audit-test-product` → 404. Absent from search, the gummies category HTML, and the sitemap. It was not added to the cart. Its stored catalogue state was not changed. |
| Cart | PASS | After add-to-cart, the cart control read “1 items” and the saved cart contained the gummies line at 2000 Euro cents. Cart page HTTP 200. |
| Checkout | PASS for the gates that were in scope | With that line in the cart, checkout showed customer, address, destination, courier, order review, and `TAX_CONFIGURATION_REQUIRED` in two places. Total used Euro formatting. Invalid email produced “Please include an '@' in the email address.” A 3-character telephone produced the minimum-length message. No IBAN, no wallet address, and no test bank details were on the page. |
| Legal | PASS for the unpublished state | Terms and company pages HTTP 200. Terms rendered “Document not published” and stated that a draft or review copy is not the active policy. Canonical URLs use `https://fusionbars.eu`. |
| Order lookup | OPENED | `GET /en/orders/lookup` → 200. A successful lookup was not submitted. |

Country behavior: the public gummies product continued from the product page into the cart and checkout. The checkout destination control showed a registry country (Germany in the inspected form). A blocked-destination message was not produced on that product, so that specific blocked-country screen remains unexercised.

Currency: Euro is the rendered launch currency. The British Pound button is not rendered while `GBP_LAUNCH_MODE` is `DISABLED_FOR_LAUNCH`. The footer mark that previously read `€/£` now reads `€`, with the sentence “EUR is the launch currency. British Pound checkout is not enabled for this launch.”

Tax: the checkout order review shows `TAX_CONFIGURATION_REQUIRED`. No numeric VAT rate was displayed and none was added.

Payments: the local server is `NODE_ENV=development`. In that mode the checkout shows the existing cryptocurrency option and the 10% merchandise discount notice. It does not show an IBAN, a wallet address, or test bank details. Production checkout options remain limited to methods whose state is `ACTIVE`. None are `ACTIVE`. No payment method was activated during this pass.

Locales, from the opened homepages:

| Locale | Result |
| --- | --- |
| English | PASS for storefront chrome. Legal documents on that locale are unpublished. |
| German | PARTIAL. HTTP 200. The homepage heading remained the English hero. Legal translations are `NOT_CONFIGURED`. |
| French | PARTIAL. Same observation. |
| Spanish | PARTIAL. Same observation. |
| Italian | PARTIAL. Same observation. |
| Dutch | PARTIAL. Same observation. |

## Admin Browser

| Screen | Result |
| --- | --- |
| Login page | OPENED. HTTP 200 at desktop, 768px, and 390px. Email and password have visible labels bound with `for`/`id`. |
| Invalid login | PASS. Message shown: “Email or password is incorrect.” No stack trace. |
| Valid login | NOT_RUN. No admin password is configured in the environment. One was not invented. |
| Logout and session persistence | NOT_RUN. No session was created. |
| Unauthenticated admin routes | PASS. `/admin`, orders, catalogue, specialist review, pricing, payments, email settings, email delivery, legal, legal settings, launch, and launch catalogue each returned 307 to `/en/admin/login`, which then returned 200. |
| Dashboard, orders, catalogue review, specialist review, pricing, payment verification, email admin, legal admin, launch control interiors | NOT_OPENED. The login wall was the page actually rendered. |
| Role-restricted route behind a session | NOT_RUN. |

A real defect was found and fixed: unauthenticated `/en/admin/login` redirected to itself because the layout only treated `x-admin-route: login` as the login screen, and that header is never set. The layout now also recognizes the `/admin/login` path from `x-pathname`. After that change the login page returns 200 and other admin routes still redirect when no session exists.

Launch control content behind the login wall was not visible. The launch evaluation in code remains `LAUNCH_BLOCKED`, production remains `PAUSED`, and activation stays unavailable while mandatory gates are unresolved. The browser gate itself stays blocking because the authenticated admin interiors were not opened.

## Responsive

Measured `documentElement.scrollWidth - clientWidth`.

| Viewport | Screens opened | Overflow |
| --- | --- | --- |
| 1440×900 | Homepage, product, cart, checkout, legal | 0px on homepage, product, cart, and checkout |
| 768×1024 | Homepage, checkout, admin login | 0px |
| 390×844 | Homepage, mobile menu, checkout form, admin login | 0px |

The 390px checkout form stacked customer fields, address, courier choice, the development cryptocurrency notice, tax state, and the place-order button. A virtual keyboard was not available in headless Edge, so keyboard occlusion of the checkout controls was not measured.

Tablet and mobile admin interiors (tables, review panels, payment verification, launch control) were not seen, because those routes redirected to login.

The mobile navigation menu opened and revealed “Shop Collection”. The language control was present. Horizontal overflow on that homepage was 0px.

## Accessibility

Smoke test only.

| Check | Result |
| --- | --- |
| Keyboard | Search dialog contained focus after Tab. Escape closed it. Admin email field accepted focus. |
| Focus visibility | Admin email computed outline style was `solid`. |
| Labels | Admin email and password labels are programmatic. Checkout fields have visible text labels. Several checkout inputs are siblings of those labels and do not use `htmlFor`. |
| Headings | Homepage h1, checkout h1 “Secure European Checkout”, and login h1 “Super Admin sign in” were present. |
| Dialog | Search uses `role="dialog"` and `aria-modal="true"`. Focus entered the dialog. Escape closed it. A full focus-trap cycle was not walked. |
| Buttons | Search, cart, add-to-cart, and sign-in expose accessible names. |
| Images | The opened product image has a descriptive alt and loaded. Decorative announcement icons were not separately audited. |
| Errors | Invalid email, short telephone, and invalid admin login produced readable messages without a stack trace, database text, or secret. |
| Contrast | Homepage, checkout, and login were inspected visually. Body text, the green primary buttons, and the login labels were readable. No obvious contrast failure was recorded. Formal contrast was not measured. |

## Console and Network

On `localhost`, the completed homepage, product, cart, checkout, legal, and login pass recorded no page errors.

Earlier requests to `127.0.0.1` logged failed hot-module WebSocket handshakes. That is development tooling when the page host and the dev server origin differ. It did not reproduce as a storefront failure on `localhost`.

`/favicon.ico` returned 404 during the first dev-server pass.

One `GET /en` returned 500 while the dev server was compiling the error page, with `SyntaxError: Unexpected end of JSON input`. The next request to `/en` returned 200. Later Edge passes loaded `/en` successfully. The 500 was not reproduced.

No mixed-content `http://fusionbars.eu` URL was present in the fetched public HTML.

## Performance

Local development navigation durations from the browser timing API, after the routes were already compiled:

| Page | Duration |
| --- | --- |
| Homepage | 1455 ms |
| Product | 943 ms |
| Cart | 673 ms |
| Checkout | 762 ms |

The first cold compile of `/` on the dev server took about 2.5 minutes and is compile time, not a customer measurement.

Production host measurement: `PERFORMANCE_MEASUREMENT_NOT_CONFIGURED`

No Lighthouse score was produced.

## Defects

### P0

None remaining.

### P1

The admin login redirect loop was a workflow defect. It is fixed. Unauthenticated login now returns 200, and protected admin routes still redirect to login.

No unresolved P1 remains in the pages that were opened.

### P2

- Authenticated admin interiors were not inspected. No admin password is configured. This remains a launch-gate blocker in the readiness evaluation.
- German, French, Spanish, Italian, and Dutch homepages render the English hero. Their legal translations are `NOT_CONFIGURED`.
- The development checkout still shows the cryptocurrency discount notice and a cryptocurrency choice. No test IBAN or wallet address is shown. Production methods stay unavailable until one is `ACTIVE`.
- A blocked-destination customer message was not produced in the browser on the public product that was purchased into the cart.
- Checkout labels are visible and several are not programmatically associated.

### P3

- `/favicon.ico` returns 404.
- The announcement bar truncates as it scrolls. That is the marquee treatment.
- The Next.js development indicator is visible only on the dev server.

## Fixes made in this closure

- Loaded `SITE_URL` and `NEXT_PUBLIC_SITE_URL` set to `https://fusionbars.eu`.
- Production configuration rejects localhost, private addresses, and `http://` customer origins.
- Customer absolute URL helper rejects absolute and localhost inputs.
- British Pound currency control is omitted, and a saved British Pound selection is ignored, while GBP launch mode is `DISABLED_FOR_LAUNCH`.
- Footer currency mark and heading describe Euro as the launch currency.
- Admin login route is recognized from the request path, which removes the redirect loop.
- Launch readiness no longer describes the site-URL check as a verified live DNS redirect.
- The final launch browser gate stays blocking and records that public pages were opened while authenticated admin interiors were not.

Catalogue decisions, prices, VAT, compliance, country eligibility, shipping prices, payment activation, email, storage, backups, monitoring, rate limits, secrets, and legal approvals were not changed. Audit Test Product was not modified.

## Validation

```text
npm test          PASSED 226, FAILED 0
npx tsc --noEmit  PASSED
npm run build     PASSED (Next.js 16.3.6, exit 0)
```

## Other Launch Blockers

These are unchanged by this closure:

- Signing secrets: `PRODUCTION_SECRET_TOO_WEAK`
- Object storage: `CONFIGURATION_REQUIRED` (local provider remains mock / TEST)
- Backups: `BACKUP_CONFIGURATION_REQUIRED`
- Monitoring: `NOT_CONFIGURED`
- Distributed rate limiting: `NOT_CONFIGURED`
- Email: `REVIEW_REQUIRED`; SPF, DKIM, and DMARC gates `NOT_CONFIGURED`; provider credential rejected; controlled email test `NOT_RUN`
- Bank transfer: TEST; Bitcoin: TEST; USDT and ETH: `NOT_CONFIGURED`; crypto conversion `CRYPTO_RATE_CONFIGURATION_REQUIRED`; production payment options empty; controlled payment test `NOT_RUN`
- VAT: `TAX_CONFIGURATION_REQUIRED`
- Legal identity: `NOT_CONFIGURED`; required English policies unpublished; other locales `NOT_CONFIGURED`
- Launch catalogue: DRAFT, 0 selected, 0 published; Audit Test Product remains `DO_NOT_PUBLISH`
- Country eligibility: unresolved
- GBP launch mode: `DISABLED_FOR_LAUNCH`
- Authenticated admin browser interiors: not opened

## Production

`PAUSED`
