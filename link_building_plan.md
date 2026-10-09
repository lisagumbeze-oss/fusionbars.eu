# Link building plan: fusionbars.eu

**Site:** https://fusionbars.eu
**Market:** Europe. English catalogue only.
**Captured:** 2026-10-08
**Status:** First mention check recorded on 2026-10-09. No verified unlinked mention, so no email was sent.

Referring domains, backlink counts, domain authority, and unlinked mentions are **unspecified**. This file does not estimate them. Search Console for this property, web, three months, captured 2026-10-08: 0 clicks, 5 impressions, average position 25. That report is not a backlink report.

## What this plan will do

Earn links to pages that already describe the shop, after a backlink export shows a real page and a real reason to write. The sender, when a row is approved, is `sales@fusionbars.eu`.

## What stays out

- Buying links, private blog networks, or paid guest-post lists.
- Invented contacts, invented domain lists, and invented mention counts.
- A disavow file. There is no toxic-link export.
- New URLs created only so another site has something to link to.
- Outreach that asks for a link to a query variant, a comparison page, or a page this shop does not publish.

## 1. Backlink audit

Do this before any email.

1. In Search Console, open Links for the verified property (`sc-domain:fusionbars.eu` or the `https://fusionbars.eu` prefix). Export top linking sites, top linked pages, and top linking text.
2. Export a backlink index (Ahrefs, Semrush Backlink Analytics, or equivalent) for `fusionbars.eu` only. Keep that export separate from the organic-ranking screenshots already saved for other domains.
3. Record, per linking URL: source URL, target URL on this site, anchor text, first seen, and whether the link is followed. If the tool does not show one of those fields, write **unspecified**.
4. Compare the export with the live English pages below. A link to a non-English catalogue URL, a filter URL, cart, checkout, or account is a canonical mismatch to note, not a page to promote.

Until those exports exist, the referring-domain baseline in `kpis.csv` stays **unspecified**, and the target table below stays at **Not started**.

## 2. Pages worth a link

These URLs exist and are the only ones to request.

| URL | Why someone would cite it |
|---|---|
| https://fusionbars.eu/en | The store: Belgian bars, gummies, and curator boxes dispatched in Europe |
| https://fusionbars.eu/en/shop | The catalogue |
| https://fusionbars.eu/en/about | Who finishes the bars, and where parcels leave from |
| https://fusionbars.eu/en/news/fusion-chocolate-bar | What a Fusion chocolate bar is |
| https://fusionbars.eu/en/news/the-chocolate | The chocolate in the bar |
| https://fusionbars.eu/en/news/chocolate-and-botanicals | Chocolate and botanicals, without a health claim |
| https://fusionbars.eu/en/faq | Ordering, payment, and dispatch |
| https://fusionbars.eu/en/shipping | Shipping terms |

Product URLs are for a link that names that flavour. They are not substitutes for the three articles above.

## 3. Competitor gap

These domains are already in `src/data/search/keyword-database.json` as organic-ranking references. Their backlink profiles are **unspecified**. They are gap-analysis subjects, not outreach targets.

| Domain | Contact | Opportunity type | Status |
|---|---|---|---|
| fusionbarsshop.com | unspecified | Backlink gap, after an export | Not started |
| myfusionbar.com | unspecified | Backlink gap, after an export | Not started |
| fusionbarsmushroom.com | unspecified | Backlink gap, after an export | Not started |
| fusionmushroombarsofficial.com | unspecified | Backlink gap, after an export | Not started |
| fusionchocolate.co.uk | unspecified | Backlink gap, after an export | Not started |

When an export exists, add a row only if all of these are true:

- The source page is a real URL you opened.
- It already discusses chocolate, confectionery retail, or a topic one of the pages above covers.
- The contact is on that site (a named editor, a published email, or a form). No guessed addresses.
- The opportunity type is one of: unlinked mention, citation on a page that already lists shops, or a correction where this shop is described inaccurately.

A page that ranks for the same query is not, by itself, a reason to email them.

## 4. Campaign sequence

*Week 1.* Export Search Console Links and one backlink index for `fusionbars.eu`. File the exports next to this plan. Do not email.

*Weeks 2–4.* Build the gap from the five domains above. Add rows that pass the rules in section 3. Status moves from **Not started** to **Verified** only after the source URL and contact are checked by hand.

*Month 2.* Send from `sales@fusionbars.eu` only for **Verified** rows. One page, one reason, one follow-up. Record the date and the reply. Status becomes **Contacted**, **Linked**, **Declined**, or **No reply**.

No weekly volume target. A target count would be invented.

## 5. Messages

Use these only after a row is **Verified**. Replace every bracket. Delete any sentence you cannot support from the live page.

**Unlinked mention.** The page already names the shop or the domain and does not link.

> Subject: Link for the Fusion Mushroom Bars mention on [page title]
>
> Hello [name],
>
> [page URL] mentions [exact name as printed]. The page that matches that mention is [one URL from section 2].
>
> If you add a link, use that URL. I can confirm any product detail against the published page.
>
> [your name]
> Fusion Mushroom Bars EU
> sales@fusionbars.eu

**Shop list or citation.** The page already lists confectionery shops or European makers.

> Subject: European shop for your [page title] list
>
> Hello [name],
>
> [page URL] lists [the kind of shop the page already lists]. Fusion Mushroom Bars EU sells artisan chocolate bars, gummies, and curator boxes, dispatched from the Netherlands, Spain, Germany, and France: [one URL from section 2].
>
> If that fits the list, the URL above is the one to cite.
>
> [your name]
> Fusion Mushroom Bars EU
> sales@fusionbars.eu

**Correction.** The page describes this shop and a fact is wrong.

> Subject: Correction on [page title]
>
> Hello [name],
>
> [page URL] says [the inaccurate sentence]. The published page says [the fact, quoted from the URL]. Source: [one URL from section 2].
>
> Happy to check any other line against the site.
>
> [your name]
> Fusion Mushroom Bars EU
> sales@fusionbars.eu

Do not attach a guest-post pitch, a broken-link template, or a press release. There is no broken-link export and no press asset beyond the pages in section 2.

## 6. Brand mention monitoring

The check on 2026-10-09 is stored in `src/data/search/visibility-log.json` and read by `src/domain/search/visibility-monitor.ts`.

Queries run: `"fusionbars.eu"` and `"Fusion Mushroom Bars EU"`. Exact mentions: none. Pages for other Fusion shops appeared in the results. Those shops were not emailed. AI citation rate for ChatGPT, Perplexity, Google AI Overviews, Bing Copilot, and Claude is **unspecified** because those engines were not queried.

Run the same queries monthly. Record the URL, the date, and whether it links to `fusionbars.eu`. An empty result stays an empty list. `buildMentionOutreach` refuses a draft until that list contains the source URL.

- `"fusionbars.eu"`
- `"Fusion Mushroom Bars EU"`
- `"Fusion Mushroom Bars"`

Ignore cart, checkout, account, and admin URLs. A mention of a different Fusion brand is not this shop unless the page names fusionbars.eu or the product line this store sells.

## 7. Measurement

Add to the monthly note in `analytics_setup.md` once an export exists:

| Metric | Baseline | Target |
|---|---|---|
| Referring domains | unspecified | unspecified |
| Links to the section 2 URLs | unspecified | unspecified |
| Verified outreach rows | 0 | unspecified |
| Links gained from those rows | 0 | unspecified |

Do not treat a Semrush organic position on a reference domain as a link, and do not treat a new referring domain as a ranking change. Rankings stay on the Search Console report.
