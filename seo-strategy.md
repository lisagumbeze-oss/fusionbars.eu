---
name: seo-strategy
description: >
  Generates a complete, end-to-end SEO strategy and implementation plan for any website.
  Use this skill whenever a user asks for an SEO plan, SEO strategy, SEO audit framework,
  or wants help improving a website's search engine visibility. Also triggers for requests
  like "help me rank higher on Google", "create an SEO roadmap", "what should I do for SEO",
  "build me an SEO plan", or any request involving organic search, keyword strategy, link
  building plans, technical SEO checklists, or content strategy for search. If the user
  mentions SEO in any context — even casually — use this skill. Produces a structured
  Markdown report covering all 8 phases plus downloadable CSV files for keywords, KPIs,
  and issue tracking.
---

# SEO Strategy Skill

## What This Skill Does
Produces a full, phased SEO strategy document (Markdown) plus structured CSV outputs for a given website. Works even when minimal inputs are provided — missing data is clearly flagged as *"unspecified"* and the plan adjusts accordingly.

## Inputs to Collect (Before Writing)
Ask the user for any missing information. If they don't provide it, note it as *"unspecified"* and proceed — do not block on missing data.

| Input | Required? | Notes |
|---|---|---|
| Website URL | Ideal | If missing, note as unspecified |
| Target market / location | Ideal | e.g. "Nigeria", "US e-commerce" |
| Business type / industry | Ideal | e.g. "SaaS", "local restaurant" |
| Known competitors | Optional | 2–3 domains if known |
| Existing keyword list | Optional | Any seed keywords |
| CMS / platform | Optional | e.g. WordPress, Shopify |
| Analytics / GSC access | Optional | Yes / No / Unknown |
| Local SEO needed? | Optional | Yes / No |

If the user gives a brief prompt (e.g. "create an SEO plan for my bakery website"), infer reasonable defaults, state your assumptions in the Executive Summary, and proceed.

---

## Output Structure

Generate the following in this order:

### 1. Markdown Report (`seo_strategy.md`)
A full plan with these sections — see **Phase Instructions** below for detail on each:

```
# SEO Strategy: [Site Name or "Unspecified Website"]

## Executive Summary
## Phase 1: Discovery & Audit
## Phase 2: Keyword Research & Competitor Analysis
## Phase 3: On-Page Optimisation
## Phase 4: Technical SEO
## Phase 5: Content Strategy & Creation
## Phase 6: Local SEO *(omit section if not applicable)*
## Phase 7: Off-Page SEO & Link Building
## Phase 8: Analytics Setup & Reporting
## KPIs & Success Metrics
## Risks & Assumptions
## Handover Deliverables Checklist
```

### 2. CSV Outputs (inline code blocks, clearly labelled)
Produce these three CSVs as fenced code blocks within the Markdown:

- **`keywords.csv`** — Keyword, Monthly Search Volume, Difficulty, Intent, Current Rank, Assigned Page, Priority
- **`kpis.csv`** — Metric, Baseline, Target, Data Source, Timeline
- **`technical_issues.csv`** — Issue, Affected URL(s), Impact (High/Medium/Low), Recommended Fix, Priority

Label each with a heading like `### keywords.csv` and wrap in ` ```csv ``` ` fences.

---

## Phase Instructions

Follow these for each section. Adapt specificity to available inputs — be concrete when inputs are known, use instructive placeholders (e.g. `[insert competitor domain]`) when unknown.

### Executive Summary
- State the website, target market, and primary SEO objectives
- List all 8 phases with a one-line summary and timeline marker (e.g. *Week 1–2, Month 1, Ongoing*)
- Note any missing inputs with *"unspecified"*
- Use **Critical** / **Nice-to-Have** priority markers

### Phase 1: Discovery & Audit
- List crawl tasks (site structure, robots.txt, sitemap.xml, HTTPS redirects)
- GSC and GA4 review checklist
- Content quality review items
- Competitor identification (use known competitors or note as unspecified)
- Output: inline **Issues Table** (URL | Issue | Severity | Recommendation) and **Competitor Benchmark Table** (Site | Est. Traffic | DA | Top Keywords)
- Timeline: Critical tasks Week 1, secondary tasks Weeks 2–3

### Phase 2: Keyword Research & Competitor Analysis
- Seed keyword generation approach based on business type
- Tool recommendations (Keyword Planner, SEMrush, Ahrefs, etc.)
- Intent classification (informational / navigational / transactional / local)
- Keyword gap analysis approach
- Keyword-to-page mapping table
- Output: `keywords.csv` (see CSV Outputs above)
- Timeline: Weeks 1–2 (Critical)

### Phase 3: On-Page Optimisation
- Metadata guidance (title <60 chars, description <160, unique per page)
- Heading structure (one H1, logical H2–H3 hierarchy)
- Content quality and keyword use
- Image alt text and compression
- URL structure rules
- Internal linking plan (pillar → cluster pattern)
- Schema markup types relevant to the business
- Output: On-Page Task List table (URL | Issue | Fix | Priority) and Internal Linking Plan table (From | To | Anchor Text)
- Timeline: Meta/heading fixes Weeks 1–2, content rewrites Weeks 2–4

### Phase 4: Technical SEO
- Core Web Vitals checklist (LCP, CLS, FID/INP)
- Mobile optimisation checks
- HTTPS and security confirmation
- Indexing and redirect audit
- Sitemap and robots.txt review
- Structured data validation
- Architecture (3-click rule)
- Output: `technical_issues.csv` and a brief Technical Summary subsection
- Timeline: Critical issues Weeks 1–2, medium issues by Month 1

### Phase 5: Content Strategy & Creation
- Content audit approach (identify thin/outdated pages)
- Content gap analysis linked to keyword clusters
- Content calendar table: Publish Date | Title/Topic | Content Type | Target Keyword | Assigned To | Status
- Content brief template (for top 3–5 priority topics): Target keyword, intent, suggested H2s, key points, SEO notes
- Timeline: Calendar finalised Month 1, first content Month 2, ongoing

### Phase 6: Local SEO *(include only if local SEO is applicable)*
- Google Business Profile setup / optimisation checklist
- NAP consistency check
- Local keyword integration
- Citations approach (top directories)
- Review strategy and response templates
- Output: Local SEO Checklist table and sample review request email template
- Timeline: GBP setup Week 1, citations Weeks 2–4

### Phase 7: Off-Page SEO & Link Building
- Backlink audit approach
- Competitor backlink gap analysis
- Link building campaign: target domain table (Domain | Contact | Opportunity Type | Status)
- Outreach email templates (guest post, broken link, PR pitch)
- Content promotion channels
- Brand mention monitoring
- Timeline: Begin Month 2 after initial content is live

### Phase 8: Analytics Setup & Reporting
- GA4 configuration checklist
- GSC linking and conversion goal setup
- Dashboard / reporting plan
- Reporting schedule (weekly snapshot, monthly in-depth)
- Output: KPI dashboard description and `kpis.csv`
- Timeline: Setup Weeks 1–2, first report end of Month 1

### KPIs & Success Metrics
Produce a summary table and the `kpis.csv`. Standard metrics to include:
- Organic Sessions, Keyword Rankings (top 3/10/20), CTR, Domain Authority, Backlinks, Bounce Rate, Conversion Rate, Core Web Vitals
- Add Local KPIs if applicable (GBP clicks, local pack rankings)

### Risks & Assumptions
- List key assumptions (CMS access, Analytics access, no migration planned, etc.)
- List risks (algorithm changes, competitor activity, developer delays, content schedule slippage)
- Flag any *"unspecified"* inputs explicitly

### Handover Deliverables Checklist
A checklist (markdown checkboxes) of all expected files:
- [ ] `seo_strategy.md`
- [ ] `keywords.csv`
- [ ] `kpis.csv`
- [ ] `technical_issues.csv`
- [ ] `sitemap.xml` (updated)
- [ ] `content_calendar.csv`
- [ ] `local_seo.md` *(if applicable)*
- [ ] `link_building_plan.md`
- [ ] `email_templates.md`
- [ ] `analytics_setup.md`

---

## Formatting Rules
- Use Markdown headers (##, ###) consistently
- Use **bold** for priority markers: **Critical**, **High**, **Medium**, **Low**, **Nice-to-Have**
- Use tables for structured data (issues, KPIs, calendars, etc.)
- Use `> **Assumption:**` blockquotes for flagged unknowns
- Wrap all CSVs in labelled fenced code blocks (` ```csv `)
- Keep tone professional but accessible — avoid jargon without brief explanation
- Italicise timeline markers: *Week 1–2*, *Month 1*, *Ongoing*

## Length Guidance
A full plan for a well-specified site should be substantial — aim for comprehensive coverage. Do not truncate phases. If inputs are sparse, use instructive placeholders rather than shortening sections.

## Saving the Output
When file creation tools are available, save the Markdown report as `/mnt/user-data/outputs/seo_strategy.md` and present it to the user. Otherwise, output the full plan inline.