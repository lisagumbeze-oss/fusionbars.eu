# COUNTRY SHIPPING CONFIGURATION REPORT

Phase 15 adds one destination layer on top of the existing country registry, specialist country review, hub allocation, and commercial shipping prices. It does not create legal eligibility decisions. Production remains `PAUSED`.

The first 10 were not changed. Each still has **0** country decisions, so product eligibility remains `NOT_CONFIGURED`. `Audit Test Product` remains `DO_NOT_PUBLISH` and cannot become destination-eligible.

## Countries

The country master is `CountryRegistry`. Store destination status is separate from product eligibility.

| Measure | Count |
| --- | ---: |
| Countries in the registry | 40 |
| Store status `ENABLED` | 36 |
| Store status `DISABLED` | 4 |
| Store status `REVIEW_REQUIRED` | 0 |
| Store status `NOT_CONFIGURED` | 0 inside the registry |

`ENABLED` means the store can offer a shipping destination. It is not a legal determination. The four disabled records are the United States, Canada, Australia, and Japan. An unknown country code is `NOT_CONFIGURED` and cannot be checked out.

Region groups such as EU and EEA are labels only. Membership does not create product eligibility.

## Product Eligibility

| Decision | Stored production rules |
| --- | ---: |
| Allowed | 0 |
| Restricted | 0 |
| Blocked | 0 |
| Deferred | 0 |
| Pilot products still `NOT_CONFIGURED` | 10 |

No product/country approval was written for the imported catalogue. Source-country claims were not converted into storefront eligibility. An unresolved product is not `ALLOWED`.

Publication readiness already blocks a product whose specialist country list has no explicit `ALLOWED` decision. Compliance `DO_NOT_PUBLISH` and `REJECTED` also block destination eligibility.

Recorded precedence:

1. Compliance terminal decision
2. Explicit product and country rule
3. Specialist product and country decision
4. Store destination configuration
5. Unresolved product eligibility remains `NOT_CONFIGURED`

The older catalogue availability service still has its own region behaviour for products that have no explicit country rule. The destination engine does not treat that behaviour as a compliance approval. Checkout now stops when an explicit rule, a specialist decision, or a terminal compliance state blocks the destination. Customer-facing errors do not include reviewer identity, evidence, or internal notes.

`ALLOW_ALL_EUROPE` and `ALLOW_ALL_COUNTRIES` are rejected.

## Shipping

| Setting | Value |
| --- | --- |
| Standard | €15.00 |
| Express | €20.00 |
| Free standard delivery | €300.00 merchandise after discount |
| Threshold basis | `ACTIVE_DISPLAY_CURRENCY` |
| EUR and GBP | Explicit prices from the commercial configuration |
| Delivery-time promise | Not configured |
| Shipping tax | `TAX_CONFIGURATION_REQUIRED` until a tax rate exists |

Express is offered only when the destination is store-enabled, the preferred hub is active, and express has not been disabled for that destination. Disabling express removes it from the quote. The server does not keep an unavailable method by silently switching the customer onto it.

Discreet packaging remains supported. The configuration does not claim secrecy or anonymity. Age verification at delivery is off. Public carrier tracking is off. Shipment email still uses the existing notification path and does not invent a carrier or tracking number.

## Fulfilment

| Measure | Count |
| --- | ---: |
| Active hubs | 4 |
| Inactive hubs | 0 |
| Routing rules | Existing NL, ES, DE, and FR destination map |
| Routing exceptions | 0 |
| Orders split across hubs | Not configured |

Hubs are the Netherlands, Spain, Germany, and France. Public pages do not show warehouse addresses. If two lines require different hubs, the order is refused with `MULTI_HUB_NOT_CONFIGURED` rather than split. If no active hub can fulfil a fail-closed request, the result is `NO_ELIGIBLE_FULFILMENT_ROUTE`. Inventory fallback in the existing hub allocator is unchanged for the current single-hub checkout path.

## Checkout

Before an order is saved, the server checks the destination country, the existing purchase-eligibility gate, publication visibility, and any explicit destination rule. The client cannot submit a shipping price or an eligibility flag. Changing country or method is recalculated on the next server quote. An order stores a shipping snapshot with country, method, price, currency, tax treatment, hub, configuration version, and eligibility state. A later rule does not rewrite that snapshot.

## Audit

No production country, shipping, or routing decision has been stored. Fixture decisions in tests are reset. Compliance managers and Super Admin can record eligibility. Order managers can view shipping and change method availability. Finance and catalogue managers can view. Customers cannot.

## First 10

| Product state | Value |
| --- | --- |
| Country decisions | 0 on every pilot product |
| Eligibility | `NOT_CONFIGURED` |
| Compliance | Unchanged, including `DO_NOT_PUBLISH` for Audit Test Product |
| Pricing | Unchanged |

## Validation

| Command | Result |
| --- | --- |
| `npm test` | 211 passed, 0 failed |
| `npx tsc --noEmit` | Exit 0 |
| `npx next build` | Exit 0. `/admin/shipping`, `/admin/shipping/countries`, and `/admin/shipping/product-eligibility` are included. |
| `npm run build` | `prisma generate` can fail with `EPERM` while `next dev` has the query engine file open. The Next.js compile is the verification used for this phase. |

The shipping admin screens were not clicked in a browser. They require a signed-in admin session. Destination behaviour is covered by the domain tests.

## Production

`PAUSED`
