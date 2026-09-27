# First batch data adjudication

Production remains **PAUSED**. No product was published.

## Verification

| Check | Result |
|-------|--------|
| `npm test` | **182/182** (168 preserved + 14 data-adjudication) |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |

## Batch completion

| | |
|--|--:|
| Products reviewed | 10 |
| Data-adjudicated | 10 |
| Specialist-review required | 10 |
| Deferred field decisions | 60 |
| Blocked / do-not-publish | 1 (`audit-test-product`) |
| Ready for publication | 0 |
| Published | 0 |

## Data decisions

- Present repository sources agreed on identity fields. Those values were explicitly confirmed. Empty SKU, ingredients, allergens, and weight stayed **UNKNOWN**.
- `a-box-of-10-fusion-gummies` and `a-box-of-fusion-gummies` are **DISTINCT_PRODUCTS** (different source record IDs, images, and USD prices 200 vs 30). They were not merged.
- `audit-test-product` is a **NON_COMMERCIAL_TEST_RECORD** with placeholder `example.com` media. Marked **DO_NOT_PUBLISH**. Raw source retained. Media sent to **MEDIA_REVIEW**.
- High-tolerance products kept factual identity only. Claims were not rewritten or approved.
- Images for the other nine products were selected from the verified source URL already on the record. Raw media was not deleted.
- No parent/variant merge was created from a shared brand prefix.

## Specialist decisions

Left unresolved on every product:

- Pricing: **PRICE_REVIEW_PENDING** (no EUR price created)
- Compliance: **REQUIRES_REVIEW**
- Country: **NOT_CONFIGURED**
- Content: raw source kept **INTERNAL_SOURCE_ONLY**
- Translation slots `en de fr es it nl`: **PENDING**
- SEO: **PENDING**
- Publication: **NOT_READY** (test record: **DO_NOT_PUBLISH**)

## Product table

| Product | Data | Pricing | Compliance | Country | Content | Media | Translation | Publication |
|---------|------|---------|------------|---------|---------|-------|-------------|-------------|
| A Box of 10 Fusion Gummies | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
| A Box of Fusion Gummies | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
| Audit Test Product | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | MEDIA_REVIEW | PENDING | DO_NOT_PUBLISH |
| Brain High Tolerance X Fusion Chocolate Bar | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
| Fun Dip High Tolerance X Fusion Chocolate Bar | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
| Fusion 100 Bars Boutique Box | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
| Fusion Bars Banana Chocolate | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
| Fusion Bars Peanut Butter | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
| Fusion Cactus Cooler Gummies | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
| Fusion Cherry Lime Gummies | ADJUDICATED | PRICE_REVIEW_PENDING | REQUIRES_REVIEW | NOT_CONFIGURED | INTERNAL_SOURCE_ONLY | VERIFIED | PENDING | NOT_READY |
