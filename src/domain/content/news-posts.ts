export interface NewsSection {
  heading: string;
  paragraphs: string[];
}

export interface NewsPost {
  slug: string;
  kicker: string;
  title: string;
  summary: string;
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
    sections: [
      {
        heading: 'A confection first',
        paragraphs: [
          'A Fusion bar in this store is Belgian chocolate with the botanicals named on that product page. Flavour, snap, and finish are the standard. The bar is sold as a confection, in the same way the gummies and the curator boxes are.',
          'The public description of a flavour is the text on its product page, after catalogue review. This journal does not add a second description, and it does not invent an ingredient that the product page does not list.',
        ],
      },
      {
        heading: 'What the bar is built from',
        paragraphs: [
          'The base the shop states is Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers. Pieces are finished in European ateliers in Barcelona and Amsterdam. Batches follow the review standard already published on the store: European GMP practice and ISO 17025 laboratory checks.',
          'If a flavour names a botanical, that name belongs on the product page for that flavour. This article does not attach a vitamin panel, a mineral count, or an antioxidant figure to the range.',
        ],
      },
      {
        heading: 'Claims this shop does not make',
        paragraphs: [
          'Other sites describe mushroom chocolate as support for memory, immunity, stress, energy, digestion, or a lower risk of disease. Fusion Mushroom Bars EU does not publish those statements. They have not been verified for this range, so they are not written here as facts about a bar.',
          'Lion’s mane, reishi, chaga, and cordyceps are often given those jobs elsewhere. Here they are not. A customer who wants the published recipe reads the product page, then orders from the shop if the flavour is listed.',
        ],
      },
      {
        heading: 'Where to read the real text',
        paragraphs: [
          'Open the chocolate bar in the shop, choose the flavour, and read that page. The price is shown in euro, and the announcement bar can switch the display to pounds. Bank transfer is offered from €100, or £100 in pounds. Bitcoin, Ethereum, and Bitcoin Cash take 10% off the merchandise. Shipping is not discounted.',
          'Questions about an ingredient go to sales@fusionbars.eu. The desk answers from the published page. It does not add a medical use.',
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
    sections: [
      {
        heading: 'There is no protocol',
        paragraphs: [
          'Guides on other sites tell a reader to take one bar a day, begin with half a bar, time it for the morning or after exercise, and then score mood and focus. That is not the description on Fusion Mushroom Bars EU.',
          'A bar is eaten when you want a piece of chocolate. It can sit with breakfast, with coffee in the afternoon, or on its own. None of those moments is a programme, and none of them changes what the product is.',
        ],
      },
      {
        heading: 'Ingredients, as written',
        paragraphs: [
          'Each flavour page lists what that bar contains. The shared base is Belgian couverture and cocoa butter. Botanicals appear only where that page names them.',
          'This article does not assign lion’s mane to mental clarity, reishi to stress or immunity, chaga to antioxidants, or cordyceps to physical performance. Those sentences are not store copy.',
        ],
      },
      {
        heading: 'How much, and with what',
        paragraphs: [
          'There is no recommended daily bar, and no instruction to start with half a bar in order to test a response. A scored square is how the confection is divided. It is not a dose.',
          'The bar can be eaten next to fruit or coffee. Putting a piece in a smoothie does not turn it into a nutrient plan. It is still the same chocolate.',
        ],
      },
      {
        heading: 'Keeping a bar in the kitchen',
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
    sections: [
      {
        heading: 'A chew, not a supplement',
        paragraphs: [
          'The gummies are fruit pectin pieces in the same shop as the chocolate bars and the curator boxes. They are ordered the same way: add one to the bag, open checkout, and choose a delivery address the store can accept.',
          'They are confections. This page does not call them chewable supplements, and it does not list lion’s mane, reishi, or any other mushroom as a health benefit of the gummy. The description that belongs to a piece is the one on its product page.',
        ],
      },
      {
        heading: 'How they sit in the range',
        paragraphs: [
          'The shop groups them under Gummies, next to Artisan Chocolate Bars and Collections. A customer who wants the bars stays on the chocolate listing. A customer who wants the chews opens the gummy listing. Both use the same bag, the same currencies, and the same payment methods.',
          'Prices show in euro. The announcement bar can switch the display to pounds, using the amount already stored for that product. Nothing on this page converts one currency into the other.',
        ],
      },
      {
        heading: 'How an order leaves',
        paragraphs: [
          'A gummy order leaves in the same plain carton as a bar order. The outer packaging has a generic sender and no botanical marks. Hubs are in the Netherlands, Spain, Germany, and France.',
          'Standard shipping is free once the merchandise reaches €300, or £260 when prices are shown in pounds. Express is offered where the address allows it. The methods for that address appear at checkout, not in this article.',
        ],
      },
      {
        heading: 'What to read before you buy',
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
    sections: [
      {
        heading: 'The words, on this site',
        paragraphs: [
          'Fusion Mushroom Bars EU uses “functional botanical” for the mycology that is part of a recipe, as that recipe is written on the product page. It is a label for an ingredient in a confection. It is not a promise about how a person will feel.',
          'The homepage describes the range as Belgian cacao and functional mycology, finished in European ateliers and sent from European hubs. That is the whole of the public claim. Effect, dose, and comparisons of experiences are not added in the journal.',
        ],
      },
      {
        heading: 'What other shops do with the same words',
        paragraphs: [
          'Other listings split products into psychedelic and functional, then describe what each group is said to do. Some of those pages talk about perception, mood, or a “high.” Fusion Mushroom Bars EU does not publish that split, and it does not describe either side.',
          'A customer who arrives from one of those pages should read the product page here as a new text. The sleeve in the photograph and the sentence on this site are not the same document. The sentence on this site is the one that passed review.',
        ],
      },
      {
        heading: 'Where the ingredient is named',
        paragraphs: [
          'If a bar or a gummy includes a named botanical, the product page is the place that says so. The journal does not repeat a recipe from memory, and it does not borrow a recipe from another Fusion site.',
          'The shared chocolate base is stated once, for the whole bar range: Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers. Flavour names — Heath, Cap’n Crunch, Ferrero, and the rest of the public list — are choices of taste. They are not categories of effect.',
        ],
      },
      {
        heading: 'What to do with a question',
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
    sections: [
      {
        heading: 'What the order is for',
        paragraphs: [
          'People order a Fusion bar or gummy because they want that confection, finished for this market and sent from a European hub. The shop is the European storefront. It is not a clinic and it is not a supplement counter.',
          'The reasons that belong on this page are practical: the flavour is listed, the price is on the product, the parcel is plain, and a person can write to the desk about the order. Cognitive support, immune support, and stress treatment are not among those reasons.',
        ],
      },
      {
        heading: 'What the customer can check',
        paragraphs: [
          'Before checkout, the product page shows the published name, the flavour, and the price in the currency on the announcement bar. The bag shows the merchandise total. Checkout shows whether bank transfer is available and whether express delivery is available for the address.',
          'Bank transfer starts at €100 of merchandise, or £100 when the currency is pounds. Cryptocurrency is Bitcoin, Ethereum, or Bitcoin Cash, at 10% off the merchandise only. Shipping stays on the bill.',
        ],
      },
      {
        heading: 'After the order is saved',
        paragraphs: [
          'The order number is the way back in. The Order Status page takes that number. Support mail is sales@fusionbars.eu, for a flavour question, a consignment, or a delivery.',
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
    sections: [
      {
        heading: 'The bar in this shop',
        paragraphs: [
          'A Fusion chocolate bar here is built on Belgian couverture and cocoa butter. The flavour sits at the centre of the product page: the name, the photograph of that sleeve, and the text that passed review.',
          'The public list includes dessert-style flavours and the display the shop shows of Heath, Cap’n Crunch, and Ferrero sleeves. Each of those is its own flavour page. A group photograph is a picture of the range. It is not the recipe of every bar in the case.',
        ],
      },
      {
        heading: 'How a bar is chosen',
        paragraphs: [
          'Open Artisan Chocolate Bars, or search the flavour. Select it, read the page, and add it to the bag. If the product has more than one variant, the selector on the card is the way to change flavour before the bag.',
          'There is no separate method of use. The bar is the confection on the page. Squares, where the sleeve is scored, are pieces of that confection.',
        ],
      },
      {
        heading: 'Price and payment',
        paragraphs: [
          'Prices are stored in euro, with a pound amount where one has been stored. Switching currency on the announcement bar changes the display. It does not invent a missing pound price.',
          'Checkout offers bank transfer when the merchandise total reaches the minimum, and cryptocurrency otherwise and as well when the customer chooses it. The 10% cryptocurrency reduction applies to the merchandise subtotal. It does not apply to shipping.',
        ],
      },
      {
        heading: 'From the page to the hub',
        paragraphs: [
          'A completed order is picked from a temperature-controlled hub in the Netherlands, Spain, Germany, or France, whichever route the address uses. The carton is plain.',
          'If the address or the product cannot be delivered, checkout says so. The article does not override that message.',
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
    sections: [
      {
        heading: 'This store, not another one',
        paragraphs: [
          'Fusion Mushroom Bars EU is the shop at fusionbars.eu. The bar described here is the one finished for European dispatch and listed in this catalogue. A page on another Fusion site, with another address and another currency, is not this product text.',
          'The announcement bar, the languages, and the euro price are part of this store. English is the indexable language. The other store languages use the same pages.',
        ],
      },
      {
        heading: 'The parcel',
        paragraphs: [
          'The outer carton is unmarked. The sender line is generic. There is no botanical print on the outside. That is the discreet dispatch the shop states, from hubs in the Netherlands, Spain, Germany, and France.',
          'Inside, the sleeve is the flavour the customer ordered. The journal does not describe the bar as a way to change perception or mood. The public text remains the product page.',
        ],
      },
      {
        heading: 'Who it is packed for',
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
    sections: [
      {
        heading: 'The hubs',
        paragraphs: [
          'Parcels leave temperature-controlled hubs in the Netherlands, Spain, Germany, and France. The route depends on the destination. A Dutch, Belgian, or Nordic address is served from the Netherlands. Spain and Portugal from Spain. Germany, Austria, and several central European addresses from Germany. France, Italy, Ireland, and the United Kingdom from France.',
          'That routing is how the shop assigns a hub. It is not a promise that every product is eligible for every one of those countries. Eligibility is checked at checkout.',
        ],
      },
      {
        heading: 'Standard and express',
        paragraphs: [
          'Checkout offers Standard Discreet Courier. Express Priority Courier appears where that address allows it. Standard shipping is free once merchandise reaches €300, or £260 when the currency on screen is pounds. Express is not included in the free-shipping threshold.',
          'The shop does not print a carrier name or a public tracking link on this page. The methods and the price for the address you type are the ones checkout shows.',
        ],
      },
      {
        heading: 'Places that are not offered',
        paragraphs: [
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
    sections: [
      {
        heading: 'The base',
        paragraphs: [
          'The bar starts with chocolate. The shop states Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers. That is the culinary standard published for the range.',
          'Flavour is then the sleeve: almond, birthday cake, toffee, hazelnut praline, cereal styles, and the other names on the public list. The taste is the reason the flavour exists. A medical reason to eat chocolate is not published here.',
        ],
      },
      {
        heading: 'What is not in this article',
        paragraphs: [
          'This page does not cite gut-health studies, mood studies, or a disease outcome. Chocolate is not described as a treatment, and neither is the botanical next to it.',
          'Any further line about a flavour — inclusions, the look of the sleeve, the score of the bar — stays on the product page that passed review. If that page is short, this article does not lengthen it with a claim.',
        ],
      },
      {
        heading: 'How the chocolate travels',
        paragraphs: [
          'Couverture is sensitive to heat. That is why the hubs are temperature-controlled and why the keeping note says cool and dry. The parcel is still a plain carton. Climate care is about the chocolate arriving as chocolate.',
          'A customer who wants the range in one place can look at the display photograph on the chocolate collection: cases and sleeves together, then each flavour on its own page.',
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
    sections: [
      {
        heading: 'What is on the public list',
        paragraphs: [
          'The shop lists chocolate bars, fruit pectin gummies, and curator boxes that have passed catalogue review. Collections cover the multi-bar boxes. Artisan Chocolate Bars covers the single sleeves. Gummies covers the chews.',
          'Audit Test Product is not part of the public range. A product that has not passed review is not described in the journal in order to fill a gap.',
        ],
      },
      {
        heading: 'Money',
        paragraphs: [
          'Euro is the price the catalogue stores. The announcement bar can show pounds when a pound amount exists for that product. Shipping in euro is €15 standard and €20 express, with free standard shipping from €300. In pounds those stored figures are £13 standard, £17.50 express, and free standard shipping from £260.',
          'Bank transfer is offered from €100 of merchandise, or £100 in pounds. Cryptocurrency is Bitcoin, Ethereum, or Bitcoin Cash. The 10% reduction is on the merchandise subtotal. Card numbers are not collected.',
        ],
      },
      {
        heading: 'After you pay',
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
    sections: [
      {
        heading: 'The ateliers',
        paragraphs: [
          'The shop states that pieces are finished in European ateliers in Barcelona and Amsterdam. That is the place-name on the store. There is no second laboratory story, and no city outside Europe is part of this account.',
          'From the atelier, stock moves to a temperature-controlled hub. The hub is the last stop before the plain carton. Netherlands, Spain, Germany, and France are the four hubs.',
        ],
      },
      {
        heading: 'The review standard the shop already prints',
        paragraphs: [
          'Batches follow the standard published on the store: European GMP practice and ISO 17025 laboratory checks. This article repeats that standard. It does not add a new certificate, a batch number, or a laboratory report that is not already on the product.',
          'A product reaches the shop after catalogue review. The public sentence is the one that review allowed. The journal does not restore a claim that review removed.',
        ],
      },
      {
        heading: 'What the customer sees',
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
    sections: [
      {
        heading: 'Why a bar is scored',
        paragraphs: [
          'Some sleeves are divided into squares so the chocolate can be broken as a confection. That is a format. It is how the piece is eaten, the same way a conventional bar is broken.',
          'This page does not turn those squares into a schedule, a measured dose, or a course. It does not say how many squares to take, how often, or what to expect from a square.',
        ],
      },
      {
        heading: 'Uses that are not described',
        paragraphs: [
          'Pain, mood, focus, and similar uses are not described here. Other sites write microdosing plans and recovery plans. Fusion Mushroom Bars EU does not publish them.',
          'If you need the published description of a flavour, open the product page. If you need a person, use the contact page. The journal is not a substitute for either.',
        ],
      },
      {
        heading: 'What “a piece” means at checkout',
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
    sections: [
      {
        heading: 'Treat it as couverture',
        paragraphs: [
          'Keep a bar cool and dry, away from heat and direct sun, the way you would keep other chocolate. Leave it in its wrap until you eat it. An open piece belongs in a closed tin if the room is warm.',
          'Dispatch starts from a temperature-controlled hub so the parcel leaves in that condition. The carton is still plain. Temperature care is for the chocolate, not a sign printed on the outside.',
        ],
      },
      {
        heading: 'What this page will not time',
        paragraphs: [
          'This page does not say how long an effect lasts. It does not give a number of hours, a onset, or a comparison between mushrooms. Those questions are not about storage.',
          'The product page does not add a separate expiry line in this article. If a date is printed on a sleeve you have in hand, that print is the one to follow. The journal will not invent a shelf life to fill the gap.',
        ],
      },
      {
        heading: 'On the way to you',
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
