# SEO Strategy: Fusion Mushroom Bars EU

## Executive Summary

**Website:** https://fusionbars.eu
**Market:** Europe. English (`/en`) is the only indexable catalogue language.
**Business:** Ecommerce for artisan chocolate bars, fruit pectin gummies, and curator boxes. The conversion is a completed order.
**Platform:** Next.js App Router.

Primary objective: keep one crawlable English URL per topic, with titles and structured data that match the visible page, and measure indexation in Search Console before adding pages.

| Phase | Summary | Timeline |
|---|---|---|
| 1. Discovery and audit | Code audit is done. Search Console Pages, Sitemaps, and field Core Web Vitals are still unexported. | *Week 1* **Critical** |
| 2. Keyword research | 83 saved rows, 17 queries, mapped to three existing articles or left unassigned. | *Done* **Critical** |
| 3. On-page | Public English pages have unique titles, descriptions, canonicals, and Open Graph. Product titles use the product name. | *Done* **Critical** |
| 4. Technical | Sitemap, robots, private-route noindex, and shop-search noindex are in code. Coverage is unconfirmed in Search Console. | *Week 1* **Critical** |
| 5. Content | Thirteen news articles are published. No new posts are scheduled. | *Ongoing* **Nice-to-Have** |
| 6. Local SEO | Omitted. No public street address. | — |
| 7. Off-page | No backlink export. No outreach list. | *Blocked* |
| 8. Analytics | Baseline is the 2026-10-08 Search Console screenshot. GA4 is unspecified. | *Week 1–2* **Critical** |

> **Assumption:** The indexable catalogue stays English-only. German, French, Spanish, Italian, and Dutch catalogue URLs canonicalise to English and are `noindex, follow`.

Missing inputs, marked **unspecified** where they appear: GA4, indexed URL count, sitemap acceptance, Core Web Vitals, this site's per-keyword rank, backlinks, and generative AI impressions.

## Phase 1: Discovery & Audit

Crawl tasks already checked in the repository:

- `src/app/sitemap.ts` lists the English catalogue, plus privacy, terms, shipping, and refunds in German, French, Spanish, Italian, and Dutch. A `/legal` translation is listed only after that locale is published.
- `src/app/robots.ts` allows `/` and points at the sitemap. Private routes are `noindex`.
- HTTPS and security headers are already set in `next.config.mjs`. The www redirect is owned by the host, not this app.
- `/products` permanently redirects to `/{locale}/shop`.

### Issues

| URL | Issue | Severity | Recommendation |
|---|---|---|---|
| https://fusionbars.eu/en/shop | Category and sort filters canonicalise here and are not separate sitemap URLs | Medium | Keep one shop document |
| https://fusionbars.eu/de/privacy and the other legal locales | Privacy, terms, shipping, and refunds are in the sitemap for each store language | Done | Keep the shop, news, and products on English URLs |
| https://fusionbars.eu/sitemap.xml | Pages and Sitemaps reports are not exported | High | Export them from Search Console |
| https://fusionbars.eu/en | Generative AI inclusion and that performance report are not exported | Medium | Save the chart CSV. The API cannot return it |

### Competitor notes

Reference domains in `src/data/search/keyword-database.json` are fusionbarsshop.com, myfusionbar.com, fusionbarsmushroom.com, fusionmushroombarsofficial.com, and fusionchocolate.co.uk. Semrush volume, difficulty, and estimated traffic in that file belong to those domains. Domain authority and estimated traffic for fusionbars.eu are **unspecified**. A competitor table with invented DA is not included.

*Week 1:* export Search Console Pages and Sitemaps. *Weeks 2–3:* export any missing Semrush country lists only if the queries describe this catalogue.

## Phase 2: Keyword Research & Competitor Analysis

Seeds came from the Search Console query report and from Semrush organic rankings of the reference domains. There is no Keyword Planner, Ahrefs, or DataForSEO export. CPC and SERP-feature ownership for this site are **unspecified**.

Intent labels below are the Semrush labels on the reference rows. Search Console rows have intent **unspecified**.

Ten assigned queries collapse onto three existing articles. One query is held (`artisan schokolade`, German, and German catalogue URLs are not indexed). Six queries are rejected because they do not describe this shop: disco chocolate bar, magic chocolate, fuse bar, fusion barre, molecular fusion, luxury chocolate box.

**Current Rank** in `keywords.csv` is blank. The report-level average position of 25 is not a rank for any single query. Semrush positions are the reference sites' positions and are stored in the JSON, not in this site's rank column.

Volume and difficulty are Semrush country-database estimates. The same query can have different volume in different countries, so Country and Source are extra columns.

### keywords.csv

```csv
Keyword,Country,Monthly Search Volume,Difficulty,Intent,Current Rank,Assigned Page,Priority,Source
artisan schokolade,unspecified,unspecified,unspecified,unspecified,,,Low,google_search_console
artisan chocolate,unspecified,unspecified,unspecified,unspecified,,https://fusionbars.eu/en/news/the-chocolate,Medium,google_search_console
craft chocolate bars,unspecified,unspecified,unspecified,unspecified,,https://fusionbars.eu/en/news/the-chocolate,Medium,google_search_console
fusion bars,US,260,27,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
chocolate fusion,US,390,35,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
mushroom bar,US,90,24,informational,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
fusion bar,DE,140,10,commercial,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
fusion bars,ES,170,5,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
fusion chocolates,ES,40,23,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
fusion bar,AU,260,22,informational+transactional,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
fusion bar,IN,880,31,commercial,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
chocolate fusion,IN,210,15,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
disco chocolate bar,DK,30,9,informational,,,Low,semrush
magic chocolate,KW,30,20,informational+navigational,,,Low,semrush
fusion chocolate,ES,50,21,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
mushrooms bar,ES,50,28,informational,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
fusion bars,IT,260,27,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
chocolate fusion,IT,390,35,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
bar mushroom,IT,90,5,informational,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
mushroom bar,IT,90,24,informational,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
bar mushroom,AU,50,28,informational,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
fuse bar,AU,260,29,informational+transactional,,,Low,semrush
mushroom bar,AU,90,29,informational,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
bar mushroom,DE,110,11,informational,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
mushroom bar,DE,110,13,informational,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
fusion bar,FR,70,27,navigational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
fusion barre,FR,70,6,informational+transactional,,,Low,semrush
mushroom bar,FR,70,16,informational+transactional,,https://fusionbars.eu/en/news/chocolate-and-botanicals,Medium,semrush
molecular fusion,MT,110,30,navigational,,,Low,semrush
chocolate fusion,TR,210,23,informational,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
fusion bar,PH,50,30,commercial,,https://fusionbars.eu/en/news/fusion-chocolate-bar,High,semrush
artisan chocolate,TR,110,14,transactional,,https://fusionbars.eu/en/news/the-chocolate,Medium,semrush
luxury chocolate box,RU,70,18,informational,,,Low,semrush
```

*Weeks 1–2:* this mapping is the keyword work. Do not open a new URL for a query variant.

## Phase 3: On-Page Optimisation

Public English pages use `publicPageMetadata` for title, description, robots, canonical, Open Graph, and Twitter. Product pages use `{product name} | Fusion Mushroom Bars EU` and the product short description. Shop search URLs are `noindex, follow`.

Open Graph images use existing assets. A dedicated 1200×630 image was not created.

### On-page tasks

| URL | Issue | Fix | Priority |
|---|---|---|---|
| https://fusionbars.eu/en/products/* | Titles are product names, not the cluster queries | Leave them. The cluster lives on the three articles. | Low |
| https://fusionbars.eu/en/shop?category=* | Filters are not their own documents | Do not write category titles while the canonical is the shop | Medium |
| https://fusionbars.eu/en | Shop notes link to the three articles and the shop | Already in place | Done |

### Internal links

| From | To | Anchor text |
|---|---|---|
| https://fusionbars.eu/en | /en/news/fusion-chocolate-bar | Fusion chocolate bars |
| https://fusionbars.eu/en | /en/news/the-chocolate | Artisan chocolate |
| https://fusionbars.eu/en | /en/news/chocolate-and-botanicals | Mushroom bars |
| https://fusionbars.eu/en | /en/shop | European artisan collection |
| News articles | /en/shop and /en/faq | European artisan collection; Ordering, payment, and dispatch |

*Weeks 1–2:* metadata is in place. Further internal links belong on a page that already discusses the topic.

## Phase 4: Technical SEO

| Check | Status |
|---|---|
| LCP, INP, CLS | **unspecified**. Not measured here. |
| Mobile parity | English pages are server-rendered. A field mobile crawl is **unspecified**. |
| HTTPS | In place |
| Indexing | English public pages are indexable in code. Search Console coverage is **unspecified**. |
| Sitemap and robots | Generated from the catalogue. Submission status is **unspecified**. |
| Structured data | Organization and WebSite on the home page, with map searches for the printed addresses. Product with SKU and an approved EUR offer when a price exists. BlogPosting on news, authored by the shop desk. FAQPage matches the visible FAQ. Breadcrumbs on products. No AggregateRating. No Google Business Profile URL. No brand Wikidata item. No SearchAction. |
| Click depth | Home, shop, and news are linked from the public layout. |

### technical_issues.csv

```csv
Issue,Affected URL(s),Impact,Recommended Fix,Priority
Shop category and sort URLs share the shop canonical and are not separate documents,https://fusionbars.eu/en/shop,Medium,Keep one shop URL. Do not give filter URLs their own titles while they canonicalise to the shop.,Medium
Search Console coverage and sitemap acceptance are not exported,https://fusionbars.eu/sitemap.xml,High,"In Search Console, open Pages and Sitemaps for the English catalogue.",High
Generative AI inclusion and the Generative AI performance report are not exported,https://fusionbars.eu/en,Medium,Export the Search chart to src/data/search/generative-ai-performance.csv. The API cannot return this report.,Medium
Semrush organic lists were not exported for several country databases,myfusionbar.com US 106; fusionbarsmushroom.com US 94; fusionmushroombarsofficial.com US 52; fusionchocolate.co.uk UK 102 and US 6,Low,Export those tables only if the missing queries describe this catalogue.,Low
Three Spain positions for fusion chocolates on fusionchocolate.co.uk are unreadable in the screenshot,https://fusionchocolate.co.uk/,Low,Reference-site data only. This site current rank stays blank.,Low
```

*Weeks 1–2:* the High issue is a Search Console export, not a code change.

## Phase 5: Content Strategy & Creation

Published articles are the content calendar. Thin or outdated scoring was not measured. No comparison, glossary, statistics, or query-variant page is planned.

Briefs for the three assigned topics, already published:

1. **What a Fusion chocolate bar is** (`/en/news/fusion-chocolate-bar`). Queries: fusion bar, fusion bars, fusion chocolate, fusion chocolates, chocolate fusion. The page says what the confection is. It is not a second product line.
2. **The chocolate in the bar** (`/en/news/the-chocolate`). Queries: artisan chocolate, craft chocolate bars.
3. **Chocolate and botanicals, without a health claim** (`/en/news/chocolate-and-botanicals`). Queries: mushroom bar, mushrooms bar, bar mushroom. No health claim.

`artisan schokolade` stays unassigned until there is an indexable German page. The rejected queries do not get briefs.

The file `content_calendar.csv` lists the thirteen published articles. Assigned To is **unspecified**. No future rows were invented.

## Phase 7: Off-Page SEO & Link Building

`link_building_plan.md` is the working plan. Referring domains and backlink counts are still **unspecified**. The five reference domains are gap-analysis subjects, not outreach targets, until a Search Console Links export and a backlink-index export exist. Messages in that file are sent only after a source URL and a contact are checked by hand. `email_templates.md` is not a second file; those messages live in the plan.

## Phase 8: Analytics Setup & Reporting

See `analytics_setup.md`. Weekly Search Console snapshots compare with the baseline below. The first monthly report waits on Pages, Sitemaps, and, if present, the Generative AI report.

### kpis.csv

```csv
Metric,Baseline,Target,Data Source,Timeline
Organic clicks,0,unspecified,"Google Search Console, fusionbars.eu, web, 3 months captured 2026-10-08",unspecified
Organic impressions,5,unspecified,"Google Search Console, fusionbars.eu, web, 3 months captured 2026-10-08",unspecified
Average position,25,unspecified,"Google Search Console report total, not a per-keyword rank",unspecified
Click-through rate,0%,unspecified,"Google Search Console, fusionbars.eu, web, 3 months captured 2026-10-08",unspecified
Indexed page count,unspecified,unspecified,"Google Search Console Pages report, not exported",unspecified
Sitemap acceptance,unspecified,unspecified,"Google Search Console Sitemaps report, not exported",unspecified
Core Web Vitals,unspecified,unspecified,Field data not measured in this repository,unspecified
GA4 organic sessions,unspecified,unspecified,GA4 connection not confirmed in this repository,unspecified
Referring domains,unspecified,unspecified,No backlink export,unspecified
Generative AI impressions,unspecified,unspecified,"Search Console Generative AI chart CSV is not in src/data/search/generative-ai-performance.csv. The Search Analytics API has no generative AI type.",unspecified
```

Domain authority, bounce rate, and conversion rate are **unspecified** and are not given targets.

## KPIs & Success Metrics

The only measured baseline is 0 clicks, 5 impressions, 0% CTR, and average position 25 on the web search type for the three months captured on 2026-10-08. Three of those impressions are artisan schokolade, artisan chocolate, and craft chocolate bars (1 impression each). Two impressions are not tied to a visible query.

## Risks & Assumptions

- English remains the only indexable catalogue language.
- Analytics access beyond one Search Console screenshot is **unspecified**.
- No migration is recorded in this plan.
- Algorithm changes and competitor activity cannot be scored without a second measurement.
- Privacy, terms, shipping, and refunds are indexable in each store language. Shop, news, and product URLs stay English. A `/legal` translation enters the sitemap only when that locale is published.
- Adding a URL per keyword would split the queries that reference sites already split across several URLs with little estimated traffic.

## What the master prompt still asks for, and the decision

`SEO_GEO_Master_Prompt.md` asks for files and tactics that this plan does not produce:

- `audit_report.json`, `crawl_inventory.csv`, and `core_web_vitals_baseline.json` need a live crawl and a Lighthouse run. They were not invented.
- `competitor_report.csv` with domain authority and estimated traffic for this site. Those figures are **unspecified**.
- Conversational pages, glossaries, comparisons, and city or "near me" pages. Not created.
- Extra robots groups for named AI crawlers. `User-agent: *` already allows `/`.
- Review stars, SearchAction, HowTo, and LocalBusiness. The site does not publish those facts.
- Auto-submit of the sitemap to Google or Bing. No API credentials are used here.
- Link gap, disavow, guest posts, and an outreach CRM. Not created.
- `public/llms.txt` already exists for non-Google agents. Google Search does not use that file.

## Handover Deliverables Checklist

- [x] `SEO_STRATEGY_FUSIONBARS.md` (this file; `seo-strategy.md` stays the skill prompt)
- [x] `keywords.csv`
- [x] `kpis.csv`
- [x] `technical_issues.csv`
- [x] Sitemap generated by `src/app/sitemap.ts`
- [x] `content_calendar.csv` (published articles only)
- [x] `analytics_setup.md`
- [ ] `local_seo.md` omitted, no public address
- [x] `link_building_plan.md`
- [x] Outreach messages are inside `link_building_plan.md`. A separate `email_templates.md` is not used.
