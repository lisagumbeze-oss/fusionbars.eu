# Analytics setup: fusionbars.eu

Connection status in this repository is **unspecified** for GA4 and for Search Console API access. The only first-party search export on file is a Search Console web performance screenshot for `sc-domain:fusionbars.eu`, captured 2026-10-08, three months, 0 clicks, 5 impressions, 0% CTR, average position 25.

## Search Console

1. Confirm the property is `sc-domain:fusionbars.eu` or the `https://fusionbars.eu` URL prefix. Record which one is verified.
2. Open Sitemaps and submit `https://fusionbars.eu/sitemap.xml` if it is not already listed. Record discovered URL count and any errors.
3. Open Pages. Record how many English catalogue URLs are indexed, and whether `/en`, `/en/shop`, product URLs, and `/en/news` are indexed.
4. Open Performance, then the Generative AI report for Search. Export the chart. Save that file as `src/data/search/generative-ai-performance.csv` with an impressions column. `loadGenerativeAiImpressions()` reads that file on the server and sums the rows. The Search Analytics API cannot return this report. A missing file means the impression count is unspecified. An empty report in the interface is not proof the property was excluded.
5. Confirm the property is included in generative AI features. Meeting crawl and snippet conditions does not mean a page will be shown.

## GA4

No GA4 property ID, stream, or conversion event is recorded in this repository. Do not treat organic sessions, bounce rate, or conversion rate as known.

When a property exists, mark a completed order as the conversion. Keep checkout, cart, account, and admin out of organic landing-page reports by relying on the existing `noindex` rules rather than by hiding those URLs from analytics.

## Reporting

- Weekly: Search Console clicks, impressions, and average position for the web search type. Compare with the 2026-10-08 baseline in `kpis.csv`.
- Monthly: indexed URL count, sitemap status, and the Generative AI report if it exists.

Targets stay **unspecified** until a second export exists. This file does not set a ranking or traffic goal.
