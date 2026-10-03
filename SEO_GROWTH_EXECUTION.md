# Search growth execution

Evidence is from the repository. Search volume, rankings, Core Web Vitals, index coverage, backlinks, and AI citations were not measured. Those figures are not estimated here.

## Classification

Fusion Mushroom Bars EU is a European ecommerce storefront for artisan chocolate bars, fruit pectin gummies, and curator boxes. The conversion is a completed order. English (`/en`) is the only indexable catalogue language. German, French, Spanish, Italian, and Dutch URLs canonicalise to English and are `noindex, follow`. Private routes (admin, account, cart, checkout, orders) are `noindex, nofollow`.

Stack: Next.js App Router, server-rendered catalogue, `src/app/sitemap.ts`, `src/app/robots.ts`.

## Modules used

TECHNICAL_SEO, ON_PAGE_SEO, ECOMMERCE_SEO, INTERNAL_LINKING, INTERNATIONAL_SEO, GENERATIVE_AI_SEARCH, ENTITY_SEO, PERFORMANCE and SECURITY were reviewed. PERFORMANCE and SECURITY headers were already in place and were left unchanged.

LOCAL_SEO, SEM, ASO, and link-building campaigns were not activated. There is no public street address, no ad account export, and no backlink export.

## What changed

- Shop, home, about, FAQ, news, news articles, privacy, and contact now publish their own title, description, canonical, robots, Open Graph, and Twitter metadata.
- Shop URLs with a `search` query are `noindex, follow`. Category and sort filters stay off the sitemap and canonicalise to `/en/shop`.
- `/products` permanently redirects to the shop.
- Homepage JSON-LD states the organization and website already described on the store. It does not add a search box, a phone number, an address, or social profiles that the site does not publish.
- Product JSON-LD keeps the approved euro offer and stock availability, adds the variant SKU when one exists, and adds a breadcrumb that matches the indexable URLs.
- News articles use BlogPosting for the published title, summary, and date, and link to the shop and FAQ.
- FAQ JSON-LD still repeats the questions visible on the page.
- `public/llms.txt` is a plain-text index for non-Google agents. Google Search does not use it.

## Eligibility for Google generative AI features

Verified in code: English public pages are crawlable, are not `noindex`, allow a snippet, and put the main copy in server-rendered HTML.

Evidence gaps: whether the pages are indexed, whether the Search Console property is included in generative AI features, and the Generative AI performance report. Meeting the technical conditions does not mean a page will be crawled, indexed, or shown.

## Tactics set aside

- Keyword volumes, difficulty, CPC, and competitor traffic. No first-party or API measurement was available.
- New pages for query variants, comparison pages, a glossary, or a statistics page.
- Rewriting existing copy into answer capsules for AI systems.
- `llms.txt` as a Google Search tactic. The file exists only for other agents.
- Extra robots rules for GPTBot, ClaudeBot, and PerplexityBot. `User-agent: *` already allows `/`.
- Review or rating schema. The store does not publish a review count.
- A street address, Google Business Profile, or location pages.
- Disavow files, outreach lists, and guest-post pipelines.
- Schema added only to influence AI Overviews or AI Mode.

## Measurement still required

In Search Console, confirm the sitemap `https://fusionbars.eu/sitemap.xml`, coverage for `/en`, `/en/shop`, product URLs, and `/en/news`, and the generative AI inclusion setting. Use the Generative AI performance report for impressions from those features. Do not treat a third-party citation tool as Google’s ranking data.
