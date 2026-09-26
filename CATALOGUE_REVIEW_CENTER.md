# Catalogue Review Center
**Target System:** Fusion Mushroom Bars EU (`https://fusionbars.eu`)  
**Route:** `/admin/catalogue/review` (also `/en/admin/catalogue/review`)  
**Authorization:** `SUPER_ADMIN`, `CATALOG_MANAGER`, `CONTENT_MANAGER`, `COMPLIANCE_MANAGER`  
**Publication:** 0 imported records published. Production launch remains paused.

---

## Governance guarantees

- Raw source records are cloned into the review working copy and never mutated.
- Source provenance (URL, file, timestamp, hash) is retained on every product.
- EUR prices are never invented. Missing EUR = `PRICING_REVIEW_REQUIRED` and not purchasable.
- USD is never auto-converted to EUR. GBP is written only when an administrator enters it; otherwise the existing configurable `CurrencyService` fallback may be previewed, not stored as an approved price.
- Country availability defaults to `NOT_CONFIGURED`. Legal availability is never inferred.
- `ProductPurchaseEligibilityService` remains authoritative for purchase.
- Imported reviews remain `STAGED` until moderated.
- Bulk publish cannot bypass pricing, compliance, eligibility, or the 12-point checklist.

---

## 1. Products requiring review

**118 / 118** unique imported products. Every imported record starts `PENDING_REVIEW` / `REQUIRES_REVIEW`. None are published.

Existing FusionBars EU catalogue (**10 parent products, 61 variants**) remains isolated and was not overwritten.

---

## 2. Possible matches remaining

**19** dynamically identified near-duplicate / collaboration identity groups, including:

- Fusion Bar Ferrero Rocher ↔ Fusion Bar Ferrari Rocher
- Fusion Bar M And Ms ↔ Fusion Bar Em and Ems
- Fusion KitKat Bar ↔ Fusion Bar Kit Cats
- Fusion Laughing Gas Gummy ↔ Laughing Gas X Fusion / Tremendous Laughing Gas
- Whole Melt x Fusion extract, 50 stacks, wholesale, and flavour SKUs

No automatic merge was performed.

---

## 3. Unresolved duplicates

**84** multi-source groups still have field conflicts (reference vs repository A/B) with no administrator field decision. Examples: Almond Crush, Birthday Cake, Cinnamon Toast, Cookie Dough, Fruit Loops, Horchata, Kap’N Krunch, Lemon Blueberry, Matcha, Milk Chocolate.

---

## 4. Pricing-review queue

**117** products lack an approved FusionBars EU EUR price (`PRICING_REVIEW_REQUIRED`, not purchasable).

Dedicated wholesale / bulk queue (12):

- Fusion 10 Bars Boutique Box
- Fusion Mushroom Bars Boutique Box
- Fusion 100 Bars Boutique Box
- Wholesale Deals on Fusion 100 Bars Box of 10 Flavors
- Fusion Mushroom Bars Wholesale
- Fusion Mushroom Bars Wholesale (100 Packs)
- A Box of Fusion Gummies
- A Box of 10 Fusion Gummies
- Fusion X Whole Melt Extract Box of 10
- Fusion X Whole Melt 50 stacks box
- Fusion X Whole Melt Wholesale
- Fusion X Whole Melt Wholesale 2000 MG Vaporizer

Source currency remains USD. No EUR was invented.

---

## 5. Compliance-review queue

**118** products are `REQUIRES_REVIEW`. None are `APPROVED` for European sale.

Collaboration queue (19), including required lines plus discovered High Tolerance / Whole Melt records:

- Laughing Gas x Fusion (gummy, chocolate, Tremendous, White Truffle, Coco Pebbles)
- Whole Melt x Fusion (box of 10, 50 stacks, wholesale, 2000mg vaporizer, Mimosa Haze, Super Limon Haze)
- High Tolerance x Fusion (Puffz, Zabores, Brain, Fun Dip, Latopop, Oulala)

European sale is not authorized until an administrator explicitly approves.

---

## 6. Category-review queue

**9** source mappings remain `PENDING` (raw source names preserved):

| Source category | Normalized target | Status |
|---|---|---|
| FUSION COLABORATION | Artisan Couverture Chocolate Bars | PENDING |
| FUSION GUMMIES | Botanical Fruit Pectin Gummies | PENDING |
| FUSION MUSHROOM BARS | Artisan Couverture Chocolate Bars | PENDING |
| Uncategorized | Artisan Couverture Chocolate Bars | PENDING |
| Chocolate Bars | Artisan Couverture Chocolate Bars | PENDING |
| Gummies | Botanical Fruit Pectin Gummies | PENDING |
| Vapes | Botanical Vaporizers & Extracts | PENDING |
| Wholesale | Curator Tasting & Collective Boxes | PENDING |
| Uncategorized (repo) | Artisan Couverture Chocolate Bars | PENDING |

Raw category names are not silently renamed. Approval records actor, timestamp, source, and target.

---

## 7. Content-review queue

**118** products await content moderation (`APPROVE` / `REWRITE` / `BLOCK`).

Original source copy is shown separately from FusionBars EU approved store copy. Approved store content starts empty. Claims flagged include health, therapeutic, psychoactive, dosage, effect, and unsupported regulatory/lab language. Replacement claims are not invented.

---

## 8. Media-review queue

**59** products have broken or missing source media (including Repository B’s tracked broken assets).

Actions: `SET PRIMARY`, `KEEP`, `REMOVE FROM PRODUCT`, `FLAG BROKEN`. Raw media records are not deleted.

---

## 9. Translation-review queue

**118** products have no approved European store copy yet. Translation readiness requires administrator-approved EU content; source language is not auto-copied into the public site.

---

## 10. Products ready for publication

**0**. The 12-point checklist has not been completed for any imported product.

Checklist: valid product, variant, SKU, EUR price, category, primary image, content, compliance, country availability, translation, SEO, inventory.

---

## 11. Products blocked

**0** currently blocked. Blocking is an explicit administrator action. Until approved, all imported products remain non-purchasable (`PENDING_REVIEW` + `REQUIRES_REVIEW` + unconfigured countries + pricing review).

---

## 12. Review decisions recorded

**0** human decisions. The review center is initialized from the master import only. A system audit record notes initialization. Subsequent field, variant, price, compliance, country, media, review, and publication actions write an audit row (actor, timestamp, entity, before, after, reason). Secrets are scrubbed.

---

## 13. Tests

**110 / 110 passed. 0 failed.**

Preserved the original 95 domain tests and added 15 Catalogue Review Center tests:

1. Review decision persistence  
2. Source provenance preservation  
3. Variant merge approval  
4. Variant merge rejection  
5. Pricing review blocking publication  
6. Compliance review blocking publication  
7. Country availability blocking purchase  
8. Category mapping approval  
9. Content approval  
10. Review moderation  
11. Media approval  
12. Publication readiness  
13. Audit log creation  
14. Bulk-review safety  
15. Raw source immutability  

---

## 14. Build

- TypeScript: `tsc --noEmit` succeeded.
- Domain suite: 110/110.
- Storefront pages (homepage, navigation, product page, cart, checkout) were not redesigned.
- Production launch remains paused. No catalogue was published.

---

## 15. Remaining human business decisions

1. **Flavour structure** — merge standalone flavours (Almond Crush, Birthday Cake, Cookie Dough, Horchata, Ferrari/Ferrero Rocher, Matcha, and the other `fusion-bar-*` records) into *Fusion Artisan Mushroom Chocolate Bar* as variants, or keep individual product pages.
2. **Wholesale EUR prices** — set approved business prices for boutique boxes, 50 stacks, and wholesale 1000/2000mg lines. Do not convert USD automatically.
3. **Collaboration EU authorization** — decide whether Laughing Gas x Fusion, Whole Melt x Fusion, and High Tolerance x Fusion may be sold in Europe, and in which countries.
4. **Category mapping sign-off** — approve or rewrite the nine pending source → EU category mappings.
5. **Content / claims rewrite** — approve, rewrite, or block source copy that contains health, therapeutic, psychoactive, dosage, or lab claims.
6. **Country matrix** — explicitly set `AVAILABLE` / `RESTRICTED` / `BLOCKED` per product. Nothing is inferred.
7. **Broken media** — replace or flag the 59 products with broken/missing assets.
8. **SEO** — write FusionBars EU titles and descriptions. Source Yoast/canonical metadata must not be copied blindly.
9. **Staged reviews** — approve, reject, or archive the 64 imported reviews. Verification status is not fabricated.
10. **Publication** — only after the 12-point checklist passes for each product.

---

## How to use

Open `/admin/catalogue/review` as `SUPER_ADMIN` or a catalogue/compliance role.

Filters: `ALL`, `NEW`, `UPDATED`, `POSSIBLE_MATCH`, `UNRESOLVED_DUPLICATE`, `PRICE_REVIEW`, `CATEGORY_REVIEW`, `CONTENT_REVIEW`, `COMPLIANCE_REVIEW`, `MEDIA_REVIEW`, `TRANSLATION_REVIEW`, `READY_TO_PUBLISH`, `BLOCKED`.

Search: name, SKU, slug, source ID, source URL, brand, category, variant, review status, compliance status.

Safe bulk actions: approve content, approve media, approve category mappings, assign category, assign compliance, set country availability. Bulk publish is gated by the full checklist.
