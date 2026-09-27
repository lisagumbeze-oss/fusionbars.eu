# COMMERCIAL CONFIGURATION REPORT

Phase 14 adds one server-side commercial calculation layer. It does not invent EUR prices, GBP prices, exchange rates, VAT rates, or tax treatment. Production remains `PAUSED`.

The first 10 specialist pricing decisions were not rewritten.

## Pricing

| Measure | Count |
| --- | ---: |
| Approved commercial EUR prices | 0 |
| Approved commercial GBP prices | 0 |
| Pilot products `PRICE_DEFERRED` | 9 |
| Pilot products `PRICE_NOT_APPLICABLE` | 1 |
| Pilot products `PRICE_REJECTED` | 0 |
| Pilot products `PRICE_APPROVED` | 0 |

`Audit Test Product` remains `PRICE_NOT_APPLICABLE`. The nine commercial pilot products remain `PRICE_DEFERRED`. No source USD amount was converted into a selling price.

Catalogue variant amounts already stored on products stay in the catalogue. They are labelled `CATALOGUE`, not an approved store price. Source prices stay labelled `SOURCE`. A product with no approved commercial price has no public structured-data offer.

`/admin/pricing` lists products with catalogue amounts, approved amounts, pricing status, tax class, reviewer, and effective date.

## Currency

| Setting | Value |
| --- | --- |
| Primary currency | EUR |
| Supported currencies | EUR, GBP |
| Pricing mode | `INDEPENDENT` |
| FX configuration | `NOT_CONFIGURED` |
| FX maximum age | `NOT_CONFIGURED` |

Independent mode requires a separate approved GBP amount. It does not copy EUR into GBP and it does not apply an exchange rate. FX-derived pricing can be turned on only by an authorised policy change, and checkout then uses a stored rate, provider, timestamp, markup, and rounding rule. A configured maximum age rejects a stale rate with `FX_RATE_STALE`. There is no live FX call during checkout.

## VAT

| Setting | Value |
| --- | --- |
| Display mode | `NOT_CONFIGURED` |
| Configured jurisdictions | 0 |
| Configured VAT rates | 0 |
| Products with an explicit tax class | 0 |
| Available class names | `STANDARD`, `REDUCED`, `ZERO`, `EXEMPT`, `SPECIAL`, `NOT_CONFIGURED` |

Class names are configuration categories. No imported product was assigned a class. A rate is versioned by country, class, effective dates, evidence, and approver. If the destination, class, or effective rate is missing, the tax engine returns `TAX_CONFIGURATION_REQUIRED` and does not choose a percentage.

## Shipping

| Setting | Value |
| --- | --- |
| Standard | €15.00 |
| Express | €20.00 |
| Free standard shipping | €300.00 merchandise |
| Threshold basis | `ACTIVE_DISPLAY_CURRENCY` |
| GBP shipping | Explicit £13.00 standard, £17.50 express, £260.00 threshold |
| Strategy | `EXPLICIT_PER_CURRENCY` |
| Hubs | Netherlands, Spain, Germany, France |
| Discreet packaging | Supported |

These are the existing shipping amounts, now read from the commercial configuration. GBP shipping is not a copy of the EUR amounts. If the threshold basis is changed to canonical EUR while pricing mode stays independent, a GBP quote returns `CONFIGURATION_REQUIRED` instead of inventing a conversion.

## Promotions

| Setting | Value |
| --- | --- |
| Stacking | `SINGLE` |
| Price below zero | Not permitted |
| Unresolved promotion issues | None added |

The cart still applies one eligible coupon through the pricing engine. Sequential stacking is available only after an explicit policy change. Client-submitted discount amounts are not accepted.

## Checkout

Calculation order:

1. Product base price
2. Variant or approved commercial price
3. Promotion or discount
4. Tax or VAT treatment
5. Shipping
6. Final order total

Money is calculated in integer cents or pence. The active rounding strategy is `NEAREST_0_01`. Intermediate amounts are not rounded again. Discount and VAT round only their own component to the nearest minor unit.

Tax treatment is `NOT_CONFIGURED`. Checkout shows that state and does not add a VAT amount. A strict settlement refuses to continue while tax status is `TAX_CONFIGURATION_REQUIRED`. The current order pipeline records that gap on the order snapshot and charges merchandise, discount, and shipping only.

Price lock policy is `RECALCULATE_AT_CHECKOUT`. A later catalogue or commercial price does not rewrite an order snapshot. The snapshot stores currency, unit and line amounts, discount, tax class, rate, shipping, total, pricing version, and configuration version.

Four-eyes approval is configurable and is not required. The same authorised finance user can draft and approve until that policy is turned on.

## Audit

No production commercial price, VAT rate, or policy change has been stored. Test fixtures exercise draft, approval, rejection, VAT, FX, and policy changes, then reset that state. Those fixture decisions are not catalogue decisions.

Bulk actions `CONVERT_ALL_USD_TO_EUR`, `APPLY_ONE_PRICE_TO_ALL`, and `APPROVE_ALL_PRICES` are rejected. An explicit price import must preview each product, currency, amount, tax class, and effective date, and it requires the confirmation `APPLY_EXPLICIT_PRICES`.

Finance and Super Admin can write commercial configuration. Catalogue managers can view it. Content, compliance, order, and customer roles cannot change prices or tax.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | 210 passed, 0 failed |
| `npx tsc --noEmit` | Exit 0, including the final currency-resolution change |
| `npx next build` | Exit 0. `/admin/pricing` and `/admin/settings/commercial` are included. |
| `npm run build` | Stopped at `prisma generate` with `EPERM` renaming `query_engine-windows.dll.node`. A running `next dev` process already had that file open. The Next.js compile itself succeeded. |

The pricing and commercial settings screens were not clicked in a browser. Admin routes require a signed-in session. Commercial behaviour is covered by the domain tests and by the production compile.

## Production

`PAUSED`
