# Catalogue Decision Recommendation Engine — Operator Report

**Status:** COMPLETE  
**Production launch:** PAUSED  
**Published imported products:** 0  

## Route

| Path | Access |
|------|--------|
| `/admin/catalogue/recommendations` | Redirect → locale |
| `/en/admin/catalogue/recommendations` | Primary UI |
| Roles | `SUPER_ADMIN`, `CATALOG_MANAGER`, `CONTENT_MANAGER`, `COMPLIANCE_MANAGER` |

## Principle

**Recommendations are not decisions.**  
Accepted items execute only through existing review/adjudication authorization and audit paths, after **CONFIRM DECISION**. The engine never publishes, never invents EUR prices, never asserts legality, never auto-authorizes countries, and never mutates raw source records.

## Delivered

1. `CatalogueDecisionRecommendation` model with SUGGESTED / ACCEPTED / REJECTED / DEFERRED  
2. Confidence: VERY_HIGH → INSUFFICIENT_EVIDENCE (source-data match strength only)  
3. Duplicate identity: LIKELY_SAME_PRODUCT / LIKELY_DIFFERENT_PRODUCT / INSUFFICIENT_EVIDENCE  
4. Field reconciliation with Reference / Repo A / Repo B / Current EU  
5. Exact-match `CONSISTENT_ACROSS_SOURCES` (one-click path still requires confirm)  
6. Conflict reason codes (no legal inference)  
7. Variant grouping candidates (no auto-merge)  
8. Category taxonomy hints (not legal classification)  
9. Pricing **classification** only (no USD→EUR retail calculation)  
10. Compliance **data-review** classes only (not LEGAL/ILLEGAL/APPROVED FOR EU)  
11. Content flag recommendations (no auto-rewrite)  
12. Country configuration required (no auto-authorize)  
13. Media quality suggestions (raw media never deleted)  
14. Review data-quality only (no auto-approve / no fabricated verification)  
15. Translation required slots (no auto-approved translations)  
16. Publication NOT_READY blocking checklist per product  
17. Priority P0–P3 (does not bypass gates)  
18. Safe bulk inspection groups  
19. Human UI: ACCEPT / REJECT / EDIT / DEFER + evidence  
20. Decision preview BEFORE / AFTER / impacts + CONFIRM  
21. Audit: ACCEPTED / REJECTED / EDITED / DEFERRED  
22. Raw source immutability  
23. Existing gates remain authoritative  

## Generated suggestion snapshot

| Metric | Value |
|--------|------:|
| Total recommendations | **1973** |
| Suggested (unreviewed) | **1973** |
| Accepted / Rejected / Deferred | **0 / 0 / 0** |
| P0 / P1 / P2 / P3 | **85 / 617 / 321 / 950** |
| Duplicate identity groups | **5** |
| Field reconciliations | **155** |
| Exact-match consensus | **376** |
| Pricing classifications | **118** |
| Compliance data-review | **118** |
| Content flags | **118** |
| Country configuration | **118** |
| Media quality | **635** |
| Translations required | **118** |
| Publication readiness | **118** (sample: NOT_READY) |
| Variant grouping | **22** |
| Category mappings | **8** |
| Review quality | **64** |
| Published imported products | **0** |

### Safe bulk inspection groups

| Group | Count |
|-------|------:|
| SOURCES_AGREE | 376 |
| SAME_VARIANT_CANDIDATE | 6 |
| NEEDS_PRICE | 117 |
| NEEDS_TRANSLATION | 118 |
| NEEDS_CONTENT_REVIEW | 118 |
| SAME_PRODUCT_CANDIDATE | 0 |

## Verification

| Check | Result |
|-------|--------|
| Tests | **140 / 140 PASSED** (127 prior + 13 recommendation) |
| `npm run build` | **PASS** |
| `npx tsc --noEmit` | **PASS** |

## Key files

- `src/domain/catalog/CatalogueDecisionRecommendationService.ts`
- `src/actions/catalogue-recommendations.ts`
- `src/app/[locale]/admin/catalogue/recommendations/page.tsx`
- `src/app/admin/catalogue/recommendations/page.tsx`

## Remaining human work

Reviewers open `/en/admin/catalogue/recommendations`, inspect evidence by priority/bulk group, ACCEPT/REJECT/EDIT/DEFER with reasons, and confirm high-risk decisions. Actual pricing, compliance, country, and publication actions remain on the Adjudication / Review Center gates.

**Production remains PAUSED.**
