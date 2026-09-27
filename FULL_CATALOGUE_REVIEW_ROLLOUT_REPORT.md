# FULL CATALOGUE REVIEW ROLLOUT REPORT

Phase 13 scales the existing human review workflow to the imported catalogue. It does not approve pricing, compliance, country eligibility, public content, translations, or publication.

Counts below were calculated from the current catalogue, first-batch, specialist, and rollout state on 27 September 2026. They are not typed progress figures.

Production control remains `PAUSED`.

## Catalogue

| Measure | Count |
| --- | ---: |
| Total imported | 118 |
| Unique products | 118 |
| First-batch products | 10 |
| Remaining unreviewed (not in a batch) | 98 |
| Assigned to the next controlled batch, still awaiting human data review | 10 |

The protected first batch is unchanged:

1. A Box of 10 Fusion Gummies
2. A Box of Fusion Gummies
3. Audit Test Product
4. Brain High Tolerance bar
5. Fun Dip High Tolerance bar
6. Fusion 100 Bars Boutique Box
7. Banana Chocolate
8. Peanut Butter
9. Cactus Cooler Gummies
10. Cherry Lime Gummies

`Audit Test Product` remains `DO_NOT_PUBLISH`. The two Fusion Gummies records remain `DISTINCT_PRODUCTS`.

## Data Review

| Measure | Count |
| --- | ---: |
| Adjudicated | 10 |
| Pending human data review | 108 |
| Deferred | 0 |
| Products with at least one unresolved source-field conflict | 84 |
| Of those, outside the pilot | 74 |

The 108 pending records are the 98 products with no batch plus the 10 products in `RB-002`. `RB-002` is queued at `DATA_REVIEW`. No factual value was confirmed, invented, or silently chosen from a conflicting source.

Unknown SKU, ingredient, allergen, weight, dimension, and attribute values stay unknown until an authorized person records them.

## Duplicate Review

| Outcome | Count |
| --- | ---: |
| Confirmed distinct | 2 |
| Confirmed duplicate | 0 |
| Possible match | 86 |
| Deferred | 0 |
| Not yet classified | 30 |

No product was merged. The two confirmed-distinct records are the existing Fusion Gummies decision. Possible matches stay in the queue for a human outcome of `DISTINCT_PRODUCTS`, `CONFIRMED_DUPLICATE`, `POSSIBLE_MATCH`, or `DEFERRED`.

## Specialist Review

Specialist-complete products: **0**.

Deferred, pending, assigned, and opened records are not counted as complete. A product is specialist-reviewed only when every required specialist decision is an explicit terminal outcome.

| Section | Current distribution |
| --- | --- |
| Pricing | 108 `PRICE_REVIEW_PENDING`, 9 `PRICE_DEFERRED`, 1 `PRICE_NOT_APPLICABLE` |
| Compliance | 108 `REQUIRES_REVIEW`, 9 `DEFERRED`, 1 `DO_NOT_PUBLISH` |
| Country | 118 `NOT_CONFIGURED` |
| Content | 108 `INTERNAL_SOURCE_ONLY`, 9 `CONTENT_DEFERRED`, 1 `DO_NOT_PUBLISH` |
| Media | 9 `VERIFIED`, 60 `MEDIA_REVIEW`, 49 `PENDING` |
| Translation | 118 `PENDING` |

Pending specialist work that still blocks publication:

| Gate | Products blocked |
| --- | ---: |
| Data | 108 |
| Pricing | 117 |
| Compliance | 118 |
| Country | 118 |
| Content | 118 |
| Media | 109 |
| Translation | 118 |
| Audit | 108 |

The audit-test record is the one product whose compliance and content outcomes are already the terminal `DO_NOT_PUBLISH` state. Its price is `PRICE_NOT_APPLICABLE`. The nine commercial pilot products remain deferred on pricing, compliance, and content, with media `VERIFIED` and country eligibility unset. No USD amount was converted to a public EUR price.

Server-side dependencies remain in force: public content cannot be approved before data adjudication, and a translation cannot be approved before approved public content. Publication readiness is still calculated only by `PublicationReadinessService`.

## Publication

| Status | Count |
| --- | ---: |
| Not ready | 117 |
| Ready for publication | 0 |
| Published | 0 |
| Do not publish | 1 |

Catalogue adjudication published list: 0. Publication ledger events from this rollout: 0. No product was published, and no bulk publish action exists.

## Batches

### FB-001 — Pilot specialist batch

| Field | Value |
| --- | --- |
| Created | 2026-09-27T02:01:56.068Z |
| Size | 10 |
| Data review completed | 10 |
| Specialist deferred | 9 |
| Blocked from publication | 10 |
| Ready | 0 |
| Published | 0 |
| Reviewers already on the specialist record | finance.review@fusionbars.eu, compliance.review@fusionbars.eu, content.review@fusionbars.eu |

This is a read-only summary of the existing pilot. The rollout queue cannot reset or reopen those decisions.

### RB-002 — Review batch 2

| Field | Value |
| --- | --- |
| Created | 2026-09-27T04:16:38.089Z |
| Created by | catalogue.manager@fusionbars.eu (`CATALOG_MANAGER`) |
| Size | 10 |
| Completed | 0 |
| Deferred | 0 |
| Blocked | 10 |
| Ready | 0 |
| Published | 0 |
| Assigned reviewers | none |

Products, in review order only:

1. fusion-bar-almond-crush
2. fusion-bar-birthday-cake
3. fusion-bar-cookie-dough
4. fusion-bar-fruit-loops
5. fusion-bar-lemon-blueberry
6. fusion-bar-matcha
7. fusion-bar-milk-chocolate
8. fusion-mocha-chocolate-bar
9. fusion-thin-mint-chocolate-bar
10. fusion-twixy-chocolate-bar

Each record is `DATA_REVIEW`, version 1, with no deferral and no specialist decision. Priority ordered the batch. It did not approve anything. The other 98 unreviewed products were left out of this batch. Further batches of 10 or 20 can be created by `SUPER_ADMIN` or `CATALOG_MANAGER` from `/admin/catalogue/review-queue`.

## Import Issues

| Status | Count |
| --- | ---: |
| Open | 202 |
| Resolved | 0 |
| Deferred | 0 |
| Rejected | 0 |

No import issue was marked resolved by this rollout. Category mappings: 9 pending, 0 confirmed, 0 remapped. Source categories were kept. Completing a mapping does not publish a product.

## Audit

| Record | Count |
| --- | ---: |
| Rollout decisions recorded | 1 |
| Action | `REVIEW_BATCH_CREATED` for `RB-002` |
| Rationale | Operational batch. No approval decisions were recorded. |
| Recommendations accepted | 0 |
| Recommendations rejected | 0 |
| Recommendations deferred | 0 |
| Publication events | 0 |
| Existing specialist audit events left in place | 40 |

The single rollout audit event stores the batch id, actor, role, timestamp, rationale, and the slug list. It does not copy full product snapshots. Confirmed pilot decisions were not rewritten.

Recommendations stay suggestions. This phase did not accept, reject, or defer any recommendation.

## Queue

`/admin/catalogue/review-queue` pages the remaining catalogue. The default unreviewed queue excludes the first 10. Filters cover review state, source, category, duplicate, pricing, compliance, country, content, media, translation, publication, product type, specialist requirement, do-not-publish, reviewer, and last updated. Search, sort, and page sizes 10, 20, and 50 are server-side. Rows do not include descriptions, source payloads, or images.

Allowed operational actions are assign reviewer, create a batch of 10 or 20, and defer with an explicit reason. `applyBulk` rejects every other action, including mass approval and bulk publish. Assignment does not grant a role. A stale version is rejected with “Record changed since it was opened. Reload before saving.”

`/admin/catalogue` shows the existing pilot metrics and a full-catalogue panel whose counts come from this snapshot. Each metric links to the matching queue.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | 209 passed, 0 failed |
| `npx tsc --noEmit` | Exit 0 |
| `npx next build` | Exit 0. Production compile completed, including `/admin/catalogue/review-queue`. |
| `npm run build` | Stopped at `prisma generate` with `EPERM` renaming `query_engine-windows.dll.node`. A `next dev` process on port 3000 already had that file open. The Next.js compile itself succeeded when run as `npx next build`. |

The new rollout test checks that the next batch excludes the pilot, records no approval, paginates without loading source payloads, rejects a stale write, refuses a finance role as batch manager, refuses bulk approval, and leaves `Audit Test Product` as `DO_NOT_PUBLISH`. Existing publication guards were not removed.

The review-queue page on the running dev server returned HTTP 307, the admin login redirect. Filters, defer, assign, and create-batch were not clicked in a browser. Those behaviours are covered by the domain tests and by the production compile.

## Production

`PAUSED`
