# Generative AI search on Google

Read this file when GENERATIVE_AI_SEARCH is active.

Rules here are paraphrased from Google's guide, [Optimizing your website for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (CC BY 4.0). This file is not a substitute for the live doc. Re-fetch that page when the user asks for current policy or exact wording. Follow links from that page for companion docs (helpful content, Search Essentials, spam policies, AI-generated content, image SEO, video SEO, JavaScript SEO, crawl budget).

## Model

Generative AI features on Google Search, including AI Overviews and AI Mode, highlight pages from the Search index.

* **Retrieval-augmented generation (grounding).** Ranking systems retrieve relevant pages. The response is built from those pages and shows clickable links to them.
* **Query fan-out.** The model issues related queries to gather more results. Do not create a page per fan-out query. Building pages to cover query variants in order to influence rankings or AI responses is scaled content abuse, and a large number of pages does not make a site more relevant.
* **AEO and GEO.** Industry labels for this work. For Google Search, the work is SEO. Judge third-party AEO or GEO advice against this file and the live guide.

Plenty of pages do well in Search, including these features, with no special AI optimization. Do not treat this checklist as a requirement to finish every item.

## Eligibility

A page is eligible for generative AI features on Google Search when all of these are true:

- [ ] Indexed
- [ ] Eligible to appear in Google Search with a snippet (Search technical requirements)
- [ ] The Search Console property is included in Search generative AI features

Inclusion is the default. Exclusion keeps the site's links and content out of those features, including grounding, so the property gets no impressions or traffic from them. Exclusion is not a ranking signal for the rest of Search. It does not override Merchant Center or Google Ads participation. It does not control model training. Blocking the page from Google Search entirely is `noindex`.

Meeting eligibility, best practices, and policies does not mean Google will crawl, index, or serve the page.

From the repository, check robots.txt, robots meta, `noindex`, `nosnippet`, canonicals, sitemap membership, and whether main content is in renderable HTML.

Search Console cannot be proven from the repo. Unless the user supplies it, mark these as evidence gaps: index status, the generative AI inclusion setting, and the Generative AI performance report.

## Content

This outweighs the other sections. Use one test: would a visitor find the page satisfying?

Prefer:

* A point of view from first-hand experience or real expertise, written by someone who knows the subject
* Non-commodity pages that go beyond common knowledge a generic summary could repeat
* Paragraphs, sections, and headings a person can follow
* Relevant images and video that support the text, using ordinary image and video SEO

Set aside:

* Commodity pages that restate common knowledge
* Pages created to match query variants or fan-out queries
* Drafts that use generative AI and fail Search Essentials or spam policies

There is no ideal page length. Choose the length the audience needs.

## Technical structure

Generative AI features use publicly crawlable content. Existing technical SEO still applies.

- [ ] Crawlable and indexable (robots, status codes, canonicals)
- [ ] Main content available to Google. JavaScript sites follow JavaScript SEO; blocked scripts are not processed
- [ ] Semantic HTML where it helps people and assistive technology. Valid, perfect HTML is not required
- [ ] Page experience: usable across devices, low latency, main content easy to distinguish
- [ ] Duplicate URLs reduced
- [ ] Crawl budget reviewed on very large, frequently updated sites

Diagnose with Search Console. Do not invent crawl or index statistics.

## Ecommerce and local

Use this section only when classification shows products for sale or a local business.

* Merchant Center feeds and on-page product information can surface in AI responses and in other Search results
* Google Business Profile supplies local business details
* Business Agent is a conversational experience on Google Search. Recommend it only when chatting with the brand is a stated goal

Product structured data stays a rich-results concern under TECHNICAL_SEO. It is not a generative AI search requirement.

## Tactics to set aside

For Google Search, report these as set aside:

| Tactic | Treatment |
| --- | --- |
| `llms.txt` and other special AI files, markup, or Markdown | Google Search does not use them. Keeping them for another system neither helps nor hurts Google Search visibility. Say that explicitly if the user still wants the file. |
| Chunking content into tiny pieces | Not required. Systems can use the relevant part of a longer page. |
| Rewriting copy for AI systems, or capturing every long-tail variant | Systems match meaning and synonyms. Pages are written for people. |
| Inauthentic mentions | Generative AI features depend on ranking quality and spam systems. Manufactured mentions are not a tactic. |
| Schema added only for AI Overviews or AI Mode | Not required, and there is no special schema.org type for these features. Keep structured data when it supports rich results. |

## Measurement

Use the Generative AI performance report in Search Console for generative AI features on Google Search and Discover.

No third-party tool has internal Google ranking or AI metrics. A tool can help a workflow. Its advice still has to pass this file and the live guide.

Never invent impressions, citations, rankings, or inclusion.

## Agent readiness

Activate AGENT_READINESS only when an agent must complete a task (reservation, specification comparison, checkout) and the Search eligibility work is already in the plan. This section does not affect AI Overview eligibility.

Browser agents may use screenshots, the DOM, and the accessibility tree. For current preparation, read [Build agent-friendly websites](https://web.dev/articles/ai-agent-site-ux) before recommending interface changes. In short: actions are visible, layout is stable, overlays do not hide controls, controls are real buttons and links with names, and labels are tied to inputs.

Universal Commerce Protocol is an emerging way for Search agents to do more. Do not treat it as a current requirement. Re-check official documentation before recommending an implementation.

## Report

1. Eligibility: verified from the project, or an evidence gap for Search Console
2. Content opportunities, judged with the satisfaction test
3. Technical blockers
4. Ecommerce or local actions, only if that section applied
5. Tactics set aside
6. Measurement plan, including missing Search Console data
7. Agent readiness, only if AGENT_READINESS was activated

## Sources

* [Generative AI search guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
* [Search generative AI control](https://support.google.com/webmasters/answer/16908024)
* [Agent-friendly websites](https://web.dev/articles/ai-agent-site-ux)
