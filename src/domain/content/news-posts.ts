export interface NewsSection {
  heading: string;
  paragraphs: string[];
}

export interface NewsPost {
  slug: string;
  kicker: string;
  title: string;
  summary: string;
  answer: string;
  date: string;
  sections: NewsSection[];
}

/** European store articles. Each one covers a topic customers ask about, in the shop's own terms. */
export const NEWS_POSTS: NewsPost[] = [
  {
    slug: 'chocolate-and-botanicals',
    kicker: 'The range',
    title: 'Chocolate and botanicals, without a health claim',
    date: '3 October 2026',
    summary: 'What a Fusion bar is made of in this shop, and the benefit list that stays off the page.',
    answer: 'A mushroom bar on this shop is the Fusion chocolate bar: Belgian couverture and cocoa butter, with botanicals named only on that flavour page. It is a confection, sold the same way as the gummies and the curator boxes. This shop does not publish memory, immunity, or disease claims for the bar.',
    sections: [
      {
        heading: 'What is a Fusion bar here?',
        paragraphs: [
          'A Fusion bar in this store is Belgian chocolate with the botanicals named on that product page. Mushroom bars here are that same confection, not a second product. Flavour, snap, and finish are the standard. The bar is sold as a confection, in the same way the gummies and the curator boxes are.',
          'The public description of a flavour is the text on its product page, after catalogue review. This journal does not add a second description, and it does not invent an ingredient that the product page does not list.',
        ],
      },
      {
        heading: 'What is the bar built from?',
        paragraphs: [
          'The base the shop states is Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers. Pieces are finished in European ateliers in Barcelona and Amsterdam. Batches follow the review standard already published on the store: European GMP practice and ISO 17025 laboratory checks.',
          'If a flavour names a botanical, that name belongs on the product page for that flavour. This article does not attach a vitamin panel, a mineral count, or an antioxidant figure to the range.',
        ],
      },
      {
        heading: 'Which claims does this shop not make?',
        paragraphs: [
          'Other sites describe mushroom chocolate as support for memory, immunity, stress, energy, digestion, or a lower risk of disease. Fusion Mushroom Bars EU does not publish those statements. They have not been verified for this range, so they are not written here as facts about a bar.',
          'Lion’s mane, reishi, chaga, and cordyceps are often given those jobs elsewhere. Here they are not. A customer who wants the published recipe reads the product page, then orders from the shop if the flavour is listed.',
        ],
      },
      {
        heading: 'Where do I read the real text?',
        paragraphs: [
          'Open the chocolate bar in the shop, choose the flavour, and read that page. The price is shown in euro, and the announcement bar can switch the display to pounds. Bank transfer is offered from €100, or £100 in pounds. Bitcoin, Ethereum, and Bitcoin Cash take 10% off the merchandise. Shipping is not discounted.',
          'Questions about an ingredient go to sales@fusionbars.eu. The desk answers from the published page. It does not add a medical use.',
        ],
      },
      {
        heading: 'Where can I buy mushroom bars in Spain?',
        paragraphs: [
          'On this shop. A mushroom bar here is the Fusion chocolate bar, and a Spanish address is packed from the Spain hub. The flavour and the price stay on the product page.',
          'How to buy a mushroom bar in Portugal uses the same hub. Add the bar in the shop and check out with a Portuguese address. A single bar is €20. Standard shipping is €15, express is €20, and standard shipping is free from €300 of merchandise.',
        ],
      },
      {
        heading: 'Are mushroom bar, mushrooms bar, and bar mushroom the same product?',
        paragraphs: [
          'Yes, on this shop. Those phrases point at the Fusion chocolate bar, not at a second recipe and not at a separate mushroom product. The botanicals, if a flavour names any, are written on that flavour page.',
          'A gummy is a different format. It is still a confection from this store, and it is not the bar. The comparison of bar, gummy, and curator box is on the compare page.',
        ],
      },
      {
        heading: 'What does this guide refuse to add?',
        paragraphs: [
          'It does not add a dose, a daily count, a mineral figure, or a claim that the bar treats, prevents, or cures anything. Other sites attach those sentences to lion’s mane, reishi, chaga, or cordyceps. This store leaves them off.',
          'The glossary defines the words this shop actually uses. The shop figures page lists the prices and thresholds already printed on the store. Neither page invents an industry survey.',
        ],
      },
    ],
  },
  {
    slug: 'how-a-bar-is-eaten',
    kicker: 'The range',
    title: 'How a bar is eaten here',
    date: '26 September 2026',
    summary: 'Eat it as chocolate. This shop does not publish a daily serving or a wellness timetable.',
    answer: 'Eat a Fusion bar as chocolate, when you want a piece. This shop does not publish a daily serving, a half-bar start, or a timetable for focus, energy, or recovery. Keep it cool, dry, and out of direct sun. The ingredients for that flavour are the list on its product page.',
    sections: [
      {
        heading: 'Is there a protocol for eating a bar?',
        paragraphs: [
          'Guides on other sites tell a reader to take one bar a day, begin with half a bar, time it for the morning or after exercise, and then score mood and focus. That is not the description on Fusion Mushroom Bars EU.',
          'A bar is eaten when you want a piece of chocolate. It can sit with breakfast, with coffee in the afternoon, or on its own. None of those moments is a programme, and none of them changes what the product is.',
        ],
      },
      {
        heading: 'Which ingredients are written down?',
        paragraphs: [
          'Each flavour page lists what that bar contains. The shared base is Belgian couverture and cocoa butter. Botanicals appear only where that page names them.',
          'This article does not assign lion’s mane to mental clarity, reishi to stress or immunity, chaga to antioxidants, or cordyceps to physical performance. Those sentences are not store copy.',
        ],
      },
      {
        heading: 'How much does it cost, and what is it eaten with?',
        paragraphs: [
          'There is no recommended daily bar, and no instruction to start with half a bar in order to test a response. A scored square is how the confection is divided. It is not a dose.',
          'The bar can be eaten next to fruit or coffee. Putting a piece in a smoothie does not turn it into a nutrient plan. It is still the same chocolate.',
        ],
      },
      {
        heading: 'How do I keep a bar in the kitchen?',
        paragraphs: [
          'Keep it cool and dry, out of direct sun, and closed in its wrap. A warm room is a reason to use a cool cupboard. The shop does not ask you to refrigerate a bar in order to protect a potency it does not claim.',
          'Parcels leave a temperature-controlled hub in that same spirit: the chocolate should travel as chocolate. If a flavour does not suit you, choose another from the shop or write to the desk.',
        ],
      },
    ],
  },
  {
    slug: 'mushroom-gummies',
    kicker: 'Gummies',
    title: 'What the gummies are',
    date: '19 September 2026',
    summary: 'Fruit pectin gummies in the European shop, listed and shipped beside the chocolate bars.',
    answer: 'The gummies are fruit pectin confections in the same European shop as the chocolate bars. They are not a supplement and not a medical product. Read the flavour page, then order from the shop if that gummy is listed. An ingredient question goes to sales@fusionbars.eu, and the reply stays with the published text.',
    sections: [
      {
        heading: 'Are the gummies a supplement?',
        paragraphs: [
          'The gummies are fruit pectin pieces in the same shop as the chocolate bars and the curator boxes. They are ordered the same way: add one to the bag, open checkout, and choose a delivery address the store can accept.',
          'They are confections. This page does not call them chewable supplements, and it does not list lion’s mane, reishi, or any other mushroom as a health benefit of the gummy. The description that belongs to a piece is the one on its product page.',
        ],
      },
      {
        heading: 'How do the gummies sit in the range?',
        paragraphs: [
          'The shop groups them under Gummies, next to Artisan Chocolate Bars and Collections. A customer who wants the bars stays on the chocolate listing. A customer who wants the chews opens the gummy listing. Both use the same bag, the same currencies, and the same payment methods.',
          'Prices show in euro. The announcement bar can switch the display to pounds, using the amount already stored for that product. Nothing on this page converts one currency into the other.',
        ],
      },
      {
        heading: 'How does a gummy order leave?',
        paragraphs: [
          'A gummy order leaves in the same plain carton as a bar order. The outer packaging has a generic sender and no botanical marks. Hubs are in the Netherlands, Spain, Germany, and France.',
          'Standard shipping is free once the merchandise reaches €300, or £260 when prices are shown in pounds. Express is offered where the address allows it. The methods for that address appear at checkout, not in this article.',
        ],
      },
      {
        heading: 'What should I read before I buy?',
        paragraphs: [
          'Open the gummy, read the published text, and check the flavour. If the page does not answer an ingredient question, write to sales@fusionbars.eu before you order.',
          'The journal will not fill that gap with a wellness claim. Catalogue review is what puts a gummy on the public list. Audit Test Product is not part of that list.',
        ],
      },
    ],
  },
  {
    slug: 'functional-botanicals',
    kicker: 'The range',
    title: 'Functional botanicals, as this shop uses the words',
    date: '12 September 2026',
    summary: 'What “functional botanical” means on a Fusion product page, and what this store refuses to add.',
    answer: 'On this store, a functional botanical is an ingredient named on that product page. The shop does not add a vitamin panel, a dose, or a disease claim to the phrase. Lion’s mane, reishi, chaga, and cordyceps are not assigned health jobs in this copy. The published recipe is the product page.',
    sections: [
      {
        heading: 'How does this site use those words?',
        paragraphs: [
          'Fusion Mushroom Bars EU uses “functional botanical” for the mycology that is part of a recipe, as that recipe is written on the product page. It is a label for an ingredient in a confection. It is not a promise about how a person will feel.',
          'The homepage describes the range as Belgian cacao and functional mycology, finished in European ateliers and sent from European hubs. That is the whole of the public claim. Effect, dose, and comparisons of experiences are not added in the journal.',
        ],
      },
      {
        heading: 'What do other shops do with the same words?',
        paragraphs: [
          'Other listings split products into psychedelic and functional, then describe what each group is said to do. Some of those pages talk about perception, mood, or a “high.” Fusion Mushroom Bars EU does not publish that split, and it does not describe either side.',
          'A customer who arrives from one of those pages should read the product page here as a new text. The sleeve in the photograph and the sentence on this site are not the same document. The sentence on this site is the one that passed review.',
        ],
      },
      {
        heading: 'Where is the ingredient named?',
        paragraphs: [
          'If a bar or a gummy includes a named botanical, the product page is the place that says so. The journal does not repeat a recipe from memory, and it does not borrow a recipe from another Fusion site.',
          'The shared chocolate base is stated once, for the whole bar range: Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers. Flavour names — Heath, Cap’n Crunch, Ferrero, and the rest of the public list — are choices of taste. They are not categories of effect.',
        ],
      },
      {
        heading: 'What do I do with an ingredient question?',
        paragraphs: [
          'If the product page is silent on an ingredient, the answer is not hiding in this article. Write to sales@fusionbars.eu and name the flavour. The desk replies from the published record.',
          'Ordering stays ordinary. Add the product to the bag, enter a European address checkout can accept, and choose bank transfer or cryptocurrency. A question about an ingredient is not a reason to invent a use.',
        ],
      },
    ],
  },
  {
    slug: 'why-people-order',
    kicker: 'The store',
    title: 'Why people order from the European store',
    date: '5 September 2026',
    summary: 'Flavour, a plain parcel, and a desk that answers. Not a wellness programme.',
    answer: 'People order here for the flavour on the page, a plain carton, and a desk that answers from the published text. The order is not a wellness programme. Checkout is on fusionbars.eu. Bank transfer starts at €100 of merchandise, and cryptocurrency takes 10% off the merchandise only.',
    sections: [
      {
        heading: 'What is the order for?',
        paragraphs: [
          'People order a Fusion bar or gummy because they want that confection, finished for this market and sent from a European hub. The shop is the European storefront. It is not a clinic and it is not a supplement counter.',
          'The reasons that belong on this page are practical: the flavour is listed, the price is on the product, the parcel is plain, and a person can write to the desk about the order. Cognitive support, immune support, and stress treatment are not among those reasons.',
        ],
      },
      {
        heading: 'What can the customer check?',
        paragraphs: [
          'Before checkout, the product page shows the published name, the flavour, and the price in the currency on the announcement bar. The bag shows the merchandise total. Checkout shows whether bank transfer is available and whether express delivery is available for the address.',
          'Bank transfer starts at €100 of merchandise, or £100 when the currency is pounds. Cryptocurrency is Bitcoin, Ethereum, or Bitcoin Cash, at 10% off the merchandise only. Shipping stays on the bill.',
        ],
      },
      {
        heading: 'What happens after the order is saved?',
        paragraphs: [
          'The order number is the way back in. The Order Status page takes that number. Support mail is sales@fusionbars.eu, for a flavour question, a consignment, or a delivery.',
          'Can I pay in pounds when I buy Fusion Bars in the United Kingdom? The announcement bar can show pounds when a pound price is stored. A single bar is £17.50. Checkout still confirms the UK address, and that parcel leaves the France hub.',
          'Company facts that have not been approved are not filled in here to make the story sound complete. If a legal page is unpublished, the footer does not pretend it is live.',
        ],
      },
    ],
  },
  {
    slug: 'fusion-chocolate-bar',
    kicker: 'Chocolate',
    title: 'What a Fusion chocolate bar is',
    date: '29 August 2026',
    summary: 'Belgian cacao, a flavour page, and an ordinary checkout.',
    answer: 'A Fusion chocolate bar here is Belgian couverture and cocoa butter, finished as a confection. Fusion bars, fusion bar, fusion chocolates, and chocolate fusion name that same product, not a second range. The flavour, photograph, and reviewed text are on the product page. One published single-bar price is €20.',
    sections: [
      {
        heading: 'What is the bar in this shop?',
        paragraphs: [
          'A Fusion chocolate bar here is built on Belgian couverture and cocoa butter. Fusion chocolate bars are this confection, including a search that says fusion bar, fusion bars, fusion chocolates, or chocolate fusion. The flavour sits at the centre of the product page: the name, the photograph of that sleeve, and the text that passed review.',
          'The public list includes dessert-style flavours and the display the shop shows of Heath, Cap’n Crunch, and Ferrero sleeves. Each of those is its own flavour page. A group photograph is a picture of the range. It is not the recipe of every bar in the case.',
        ],
      },
      {
        heading: 'How is a bar chosen?',
        paragraphs: [
          'Open Artisan Chocolate Bars, or search the flavour. Select it, read the page, and add it to the bag. If the product has more than one variant, the selector on the card is the way to change flavour before the bag.',
          'There is no separate method of use. The bar is the confection on the page. Squares, where the sleeve is scored, are pieces of that confection.',
        ],
      },
      {
        heading: 'What do price and payment look like?',
        paragraphs: [
          'Prices are stored in euro, with a pound amount where one has been stored. Switching currency on the announcement bar changes the display. It does not invent a missing pound price.',
          'Checkout offers bank transfer when the merchandise total reaches the minimum, and cryptocurrency otherwise and as well when the customer chooses it. The 10% cryptocurrency reduction applies to the merchandise subtotal. It does not apply to shipping.',
        ],
      },
      {
        heading: 'How does a bar get from the page to the hub?',
        paragraphs: [
          'A completed order is picked from a temperature-controlled hub in the Netherlands, Spain, Germany, or France, whichever route the address uses. The carton is plain.',
          'If the address or the product cannot be delivered, checkout says so. The article does not override that message.',
        ],
      },
      {
        heading: 'How do I buy fusion chocolate in Germany?',
        paragraphs: [
          'Open the flavour in the shop and check out with a German address. Germany is packed from the Germany hub. Payment is bank transfer from €100 of merchandise, or Bitcoin, Ethereum, or Bitcoin Cash at 10% off the merchandise only.',
          'How much for a Fusion chocolate bar in the Netherlands is €20 for one bar, or £17.50 when pounds are shown. A Dutch address adds the shipping checkout shows, unless the merchandise reaches €300 and standard delivery is free. The Netherlands hub packs that order.',
        ],
      },
      {
        heading: 'What do fusion bars, fusion chocolates, and chocolate fusion mean here?',
        paragraphs: [
          'They mean this confection. A search that says fusion bar, fusion bars, fusion chocolate, fusion chocolates, or chocolate fusion is looking for the same European shop and the same flavour pages. It is not a licence to open a new URL for each spelling.',
          'Some sleeves are collaborations and publish their own price. When a product page says €25, that page wins over the €20 figure used for the single bar described on the homepage. The announcement bar can show pounds only when a pound amount is stored.',
        ],
      },
      {
        heading: 'How does a fusion chocolate bar differ from a gummy or a box?',
        paragraphs: [
          'The bar is scored chocolate. The gummy is a fruit pectin chew. A curator box is a packed selection of the range, and the 10-bar tasting box published on the homepage is €150, or £128 when pounds are shown. Each format has its own product page.',
          'Payment is the same across them. Bank transfer is offered from €100 of merchandise, or £100 in pounds. Bitcoin, Ethereum, and Bitcoin Cash take 10% off the merchandise subtotal. Shipping is never part of that reduction.',
        ],
      },
      {
        heading: 'Where should I read next?',
        paragraphs: [
          'The chocolate article covers artisan chocolate and craft chocolate bars. The botanicals article covers mushroom bars and the claims this shop does not make. The glossary, the comparison, and the shop figures sit beside those three notes.',
          'Ordering still ends in the shop. This guide does not replace the flavour page, the bag, or the message checkout shows when an address cannot be served.',
        ],
      },
    ],
  },
  {
    slug: 'the-european-bar',
    kicker: 'The store',
    title: 'The bar, written for this store',
    date: '22 August 2026',
    summary: 'The European Fusion bar: the sleeve, the plain carton, and the countries checkout can accept.',
    answer: 'The European Fusion bar is the bar this store sells: a sleeve, a plain carton, and delivery only where checkout accepts the address. Parcels leave the Netherlands, Spain, Germany, or France. This note is about fusionbars.eu. Another site using the Fusion name is not this order.',
    sections: [
      {
        heading: 'Is this the store, or another one?',
        paragraphs: [
          'Fusion Mushroom Bars EU is the shop at fusionbars.eu. The bar described here is the one finished for European dispatch and listed in this catalogue. A page on another Fusion site, with another address and another currency, is not this product text.',
          'The announcement bar, the languages, and the euro price are part of this store. English is the indexable language. The other store languages use the same pages.',
        ],
      },
      {
        heading: 'What is in the parcel?',
        paragraphs: [
          'The outer carton is unmarked. The sender line is generic. There is no botanical print on the outside. That is the discreet dispatch the shop states, from hubs in the Netherlands, Spain, Germany, and France.',
          'Inside, the sleeve is the flavour the customer ordered. The journal does not describe the bar as a way to change perception or mood. The public text remains the product page.',
        ],
      },
      {
        heading: 'Who is the parcel packed for?',
        paragraphs: [
          'Checkout accepts European addresses, including the EU and the United Kingdom, when the product and the destination allow it. The United States and Canada are not offered.',
          'A customer outside that list will not get a special route from this article. The cart stops at checkout rather than promising a delivery the store cannot make.',
        ],
      },
    ],
  },
  {
    slug: 'where-parcels-go',
    kicker: 'Dispatch',
    title: 'Where a Fusion parcel goes',
    date: '15 August 2026',
    summary: 'Four European hubs, two courier choices, and a list of places this shop does not ship.',
    answer: 'Parcels leave temperature-controlled hubs in the Netherlands, Spain, Germany, and France. Checkout offers standard and express courier where the address allows it. Standard shipping is free from €300 of merchandise, or £260 in pounds. The United States and Canada are not offered.',
    sections: [
      {
        heading: 'Where are the hubs?',
        paragraphs: [
          'Parcels leave temperature-controlled hubs in the Netherlands, Spain, Germany, and France. The route depends on the destination. A Dutch, Belgian, or Nordic address is served from the Netherlands. Spain and Portugal from Spain. Germany, Austria, and several central European addresses from Germany. France, Italy, Ireland, and the United Kingdom from France.',
          'That routing is how the shop assigns a hub. It is not a promise that every product is eligible for every one of those countries. Eligibility is checked at checkout.',
        ],
      },
      {
        heading: 'What is standard delivery, and what is express?',
        paragraphs: [
          'Checkout offers Standard Discreet Courier. Express Priority Courier appears where that address allows it. Standard shipping is free once merchandise reaches €300, or £260 when the currency on screen is pounds. Express is not included in the free-shipping threshold.',
          'The shop does not print a carrier name or a public tracking link on this page. The methods and the price for the address you type are the ones checkout shows.',
        ],
      },
      {
        heading: 'Which places are not offered?',
        paragraphs: [
          'Where can I buy craft chocolate bars in the United Kingdom is fusionbars.eu. The United Kingdom is packed from the France hub. Craft chocolate bars here are the Fusion bars.',
          'How much for delivery of Fusion Bars to Italy is €15 standard or €20 express. The bar itself is €20. Italy uses the France hub. This note still does not publish a number of delivery days.',
          'The United States, Canada, and other countries outside the European list are not delivery destinations. This article is not an import guide, and it does not explain how to bring a bar into a country the checkout refuses.',
          'If a product is unavailable for an address that is otherwise in Europe, the message at checkout is the one to follow. The journal cannot clear that block.',
        ],
      },
    ],
  },
  {
    slug: 'the-chocolate',
    kicker: 'Chocolate',
    title: 'The chocolate in the bar',
    date: '8 August 2026',
    summary: 'Couverture, cocoa butter, and the flavour on the sleeve. Not a health study.',
    answer: 'The chocolate in a Fusion bar is Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers. That is the artisan chocolate and the craft chocolate bars in this European collection. This article does not add a health study. The hubs are temperature-controlled because couverture is sensitive to heat.',
    sections: [
      {
        heading: 'What is the chocolate base?',
        paragraphs: [
          'The bar starts with chocolate. The shop states Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers. That chocolate is artisan chocolate, the craft chocolate bars sold in the European collection. That is the culinary standard published for the range.',
          'Flavour is then the sleeve: almond, birthday cake, toffee, hazelnut praline, cereal styles, and the other names on the public list. The taste is the reason the flavour exists. A medical reason to eat chocolate is not published here.',
        ],
      },
      {
        heading: 'What is not in this article?',
        paragraphs: [
          'This page does not cite gut-health studies, mood studies, or a disease outcome. Chocolate is not described as a treatment, and neither is the botanical next to it.',
          'Any further line about a flavour — inclusions, the look of the sleeve, the score of the bar — stays on the product page that passed review. If that page is short, this article does not lengthen it with a claim.',
        ],
      },
      {
        heading: 'How does the chocolate travel?',
        paragraphs: [
          'Couverture is sensitive to heat. That is why the hubs are temperature-controlled and why the keeping note says cool and dry. The parcel is still a plain carton. Climate care is about the chocolate arriving as chocolate.',
          'A customer who wants the range in one place can look at the display photograph on the chocolate collection: cases and sleeves together, then each flavour on its own page.',
        ],
      },
      {
        heading: 'Where can I buy artisan chocolate in Italy?',
        paragraphs: [
          'In this shop. An Italian address leaves from the France hub. Artisan chocolate here is the Fusion bar, built on Belgian couverture.',
          'How much for craft chocolate bars in France is €20 a bar. A French address uses that euro price, plus the shipping method at checkout: €15 standard or €20 express. Standard shipping is free from €300 of merchandise.',
        ],
      },
      {
        heading: 'What is artisan chocolate on this store?',
        paragraphs: [
          'Artisan chocolate here is the Fusion bar range: Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers, finished in European ateliers. Craft chocolate bars are that same range. The phrase is not a second catalogue.',
          'A flavour page can name a botanical. This article does not move that name onto every bar, and it does not turn the chocolate into a supplement. The public description is the one that passed catalogue review.',
        ],
      },
      {
        heading: 'What does Belgian couverture mean in this shop?',
        paragraphs: [
          'It is the chocolate base the store states for the bars. The shop points at the ISO/IEC 17025 laboratory-check standard it already prints, and at cacao as a commodity through the International Cocoa Organization. Those links name the standards. They are not a claim that this shop wrote the standard.',
          'Couverture softens in heat. That is why dispatch uses temperature-controlled hubs in the Netherlands, Spain, Germany, and France, and why the keeping note says cool, dry, and out of direct sun.',
        ],
      },
      {
        heading: 'How long is this guide meant to be?',
        paragraphs: [
          'Long enough to say what the chocolate is, what it is not, what it costs when the store has published a figure, and where it can go. It is not padded with a market-size survey, a competitor ranking, or a health study this shop does not have.',
          'If a number is missing, the product page or checkout is the source. This note will not invent a delivery-day count or a pound price that was never stored.',
        ],
      },
    ],
  },
  {
    slug: 'everything-in-one-place',
    kicker: 'The store',
    title: 'Fusion Mushroom Bars EU, in one place',
    date: '1 August 2026',
    summary: 'The range, the two currencies, the two ways to pay, and where a question goes.',
    answer: 'Fusion Mushroom Bars EU keeps the range, the euro and pound display, and the two payment methods on this site. Bank transfer is offered from €100, or £100 in pounds. Bitcoin, Ethereum, and Bitcoin Cash take 10% off the merchandise subtotal. Shipping is not discounted. Support is sales@fusionbars.eu.',
    sections: [
      {
        heading: 'What is on the public list?',
        paragraphs: [
          'The shop lists chocolate bars, fruit pectin gummies, and curator boxes that have passed catalogue review. Collections cover the multi-bar boxes. Artisan Chocolate Bars covers the single sleeves. Gummies covers the chews.',
          'Audit Test Product is not part of the public range. A product that has not passed review is not described in the journal in order to fill a gap.',
        ],
      },
      {
        heading: 'How is the money shown?',
        paragraphs: [
          'Euro is the price the catalogue stores. The announcement bar can show pounds when a pound amount exists for that product. Shipping in euro is €15 standard and €20 express, with free standard shipping from €300. In pounds those stored figures are £13 standard, £17.50 express, and free standard shipping from £260.',
          'Do Fusion Bars cost the same in Poland as in the Netherlands? The catalogue price is the euro price, €20 for a single bar, in either country. Poland is packed from the Germany hub. The Netherlands is packed from the Netherlands hub. Shipping is calculated for that address at checkout.',
          'Bank transfer is offered from €100 of merchandise, or £100 in pounds. Cryptocurrency is Bitcoin, Ethereum, or Bitcoin Cash. The 10% reduction is on the merchandise subtotal. Card numbers are not collected.',
        ],
      },
      {
        heading: 'What happens after you pay?',
        paragraphs: [
          'The order number is for the Order Status page. Support is sales@fusionbars.eu. The FAQ holds the short answers on safety, shipping, and how a bar is eaten.',
          'Privacy explains what checkout stores: name, address, email, and phone, used to ship the order and to write about it. The newsletter field stores an address only when someone submits it. A marketing email is not sent while that delivery is inactive.',
        ],
      },
    ],
  },
  {
    slug: 'how-a-bar-is-finished',
    kicker: 'The range',
    title: 'How a bar is finished',
    date: '25 July 2026',
    summary: 'European ateliers, a published review standard, then a hub.',
    answer: 'A bar is finished in European ateliers, then held to the review standard the shop already prints: European GMP practice and ISO 17025 laboratory checks. The customer sees the flavour page. This note does not add a separate certificate. After review, the order leaves a hub.',
    sections: [
      {
        heading: 'Where are the ateliers?',
        paragraphs: [
          'The shop states that pieces are finished in European ateliers in Barcelona and Amsterdam. That is the place-name on the store. There is no second laboratory story, and no city outside Europe is part of this account.',
          'From the atelier, stock moves to a temperature-controlled hub. The hub is the last stop before the plain carton. Netherlands, Spain, Germany, and France are the four hubs.',
        ],
      },
      {
        heading: 'What review standard does the shop already print?',
        paragraphs: [
          'Batches follow the standard published on the store: European GMP practice and ISO 17025 laboratory checks. This article repeats that standard. It does not add a new certificate, a batch number, or a laboratory report that is not already on the product.',
          'A product reaches the shop after catalogue review. The public sentence is the one that review allowed. The journal does not restore a claim that review removed.',
        ],
      },
      {
        heading: 'What does the customer see?',
        paragraphs: [
          'The customer sees the sleeve, the flavour name, the price, and the bag. The display photograph shows cases and loose bars together so the range is visible in one frame. The flavour page is still the page that sells that one bar.',
          'Discreet packaging starts when the order leaves. The sleeve is inside. The outside of the parcel does not repeat it.',
        ],
      },
    ],
  },
  {
    slug: 'pieces-not-a-schedule',
    kicker: 'The range',
    title: 'Squares of chocolate, not a schedule',
    date: '18 July 2026',
    summary: 'A scored bar is a confection divided into pieces. It is not a plan.',
    answer: 'A scored bar is chocolate divided into pieces. A piece is part of that confection. It is not a daily plan, a half-bar protocol, or a schedule for an effect. The shop does not publish those uses. Eat it as chocolate, and read the flavour page for what that bar contains.',
    sections: [
      {
        heading: 'Why is a bar scored?',
        paragraphs: [
          'Some sleeves are divided into squares so the chocolate can be broken as a confection. That is a format. It is how the piece is eaten, the same way a conventional bar is broken.',
          'This page does not turn those squares into a schedule, a measured dose, or a course. It does not say how many squares to take, how often, or what to expect from a square.',
        ],
      },
      {
        heading: 'Which uses are not described?',
        paragraphs: [
          'Pain, mood, focus, and similar uses are not described here. Other sites write microdosing plans and recovery plans. Fusion Mushroom Bars EU does not publish them.',
          'If you need the published description of a flavour, open the product page. If you need a person, use the contact page. The journal is not a substitute for either.',
        ],
      },
      {
        heading: 'What does a piece mean at checkout?',
        paragraphs: [
          'The thing you add to the bag is the bar, or the gummy, as the product page sells it. The price is for that unit. Splitting a bar in the kitchen does not create a second product and does not change the order.',
          'Payment, shipping, and the plain carton all apply to the unit on the order. They do not apply to a personal schedule.',
        ],
      },
    ],
  },
  {
    slug: 'keeping-a-bar',
    kicker: 'Dispatch',
    title: 'How long to keep a bar',
    date: '11 July 2026',
    summary: 'Store it as chocolate. This note is about the kitchen, not about effects.',
    answer: 'Keep a Fusion bar as couverture: cool, dry, and out of direct sun. If a parcel arrives warm, let it cool before you judge the snap. This note does not time an effect. A wrong order goes to sales@fusionbars.eu. The desk does not answer a question about duration of effect.',
    sections: [
      {
        heading: 'Should I treat it as couverture?',
        paragraphs: [
          'Keep a bar cool and dry, away from heat and direct sun, the way you would keep other chocolate. Leave it in its wrap until you eat it. An open piece belongs in a closed tin if the room is warm.',
          'Dispatch starts from a temperature-controlled hub so the parcel leaves in that condition. The carton is still plain. Temperature care is for the chocolate, not a sign printed on the outside.',
        ],
      },
      {
        heading: 'What will this page not time?',
        paragraphs: [
          'This page does not say how long an effect lasts. It does not give a number of hours, a onset, or a comparison between mushrooms. Those questions are not about storage.',
          'The product page does not add a separate expiry line in this article. If a date is printed on a sleeve you have in hand, that print is the one to follow. The journal will not invent a shelf life to fill the gap.',
        ],
      },
      {
        heading: 'What happens on the way to you?',
        paragraphs: [
          'A hub in the Netherlands, Spain, Germany, or France hands the parcel to the courier checkout selected. Standard or express is the choice the address allows. Free standard shipping, when the merchandise qualifies, does not change how the bar should be kept when it arrives.',
          'If a parcel arrives warm, the practical step is the same as for any chocolate: let it cool before you judge the snap. Write to sales@fusionbars.eu if the order itself is wrong. Do not write for a duration of effect. The desk does not answer that.',
        ],
      },
    ],
  },
];

export function getNewsPost(slug: string): NewsPost | undefined {
  return NEWS_POSTS.find((post) => post.slug === slug);
}
