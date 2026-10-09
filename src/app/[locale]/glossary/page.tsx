import type { Metadata } from 'next';
import Link from 'next/link';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import QuickAnswer from '@/components/seo/QuickAnswer';
import { BRAND_ENCYCLOPEDIA, SUBJECT_ENTITIES } from '@/domain/content/public-trust';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface GlossaryPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

const TERMS: Array<{ term: string; definition: string }> = [
  {
    term: 'Fusion chocolate bar',
    definition:
      'The confection this shop sells as a bar. It is built on Belgian couverture and cocoa butter. Fusion bars, fusion bar, fusion chocolate, fusion chocolates, and chocolate fusion are names for that same product. The flavour, the sleeve, and the reviewed description live on the product page.',
  },
  {
    term: 'Artisan chocolate',
    definition:
      'On this store, artisan chocolate is the Fusion bar range, not a second catalogue. Craft chocolate bars means the same range. The culinary standard the shop prints is Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers.',
  },
  {
    term: 'Mushroom bar',
    definition:
      'A mushroom bar here is the Fusion chocolate bar. Mushrooms bar and bar mushroom point at that same confection. Botanicals are named only on the flavour page that lists them. The shop does not publish a medical use for the bar.',
  },
  {
    term: 'Fruit pectin gummies',
    definition:
      'A chew in the same European shop, listed beside the bars. A gummy is not a supplement and not the bar. The price and the ingredient list are the ones on that gummy’s product page.',
  },
  {
    term: 'Curator box',
    definition:
      'A packed selection from the range. The 10-bar tasting box published on the homepage is €150, or £128 when pounds are shown. A box is its own product page. It does not replace the description of each bar inside it.',
  },
  {
    term: 'Belgian couverture',
    definition:
      'The chocolate base the shop states for the bars, with cocoa butter, and without palm oil or synthetic stabilisers. Couverture is sensitive to heat, which is why the hubs are temperature-controlled and why a bar is kept cool and dry.',
  },
  {
    term: 'ISO 17025',
    definition:
      'The laboratory-check standard the shop already names for batch review, together with European GMP practice. The store links to the ISO/IEC 17025 page. That link does not mean this shop wrote the standard or that a certificate is printed on the news note.',
  },
  {
    term: 'Hub',
    definition:
      'A temperature-controlled dispatch point. Parcels leave the Netherlands, Spain, Germany, or France, depending on the address. The outer carton is plain. Checkout, not this glossary, confirms that an address can be served.',
  },
];

export async function generateMetadata({ params }: GlossaryPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/glossary`,
    title: 'Glossary | Fusion Mushroom Bars EU',
    description:
      'What this shop means by Fusion chocolate bar, artisan chocolate, mushroom bar, gummies, curator box, couverture, and hub.',
  });
}

export default async function GlossaryPage({ params }: GlossaryPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Glossary', path: '/en/glossary' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212]">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Glossary</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">What do these words mean here?</h1>
          <QuickAnswer className="mt-6 rounded-2xl border border-[#E5E3DD] bg-white px-5 py-4">
            This glossary defines words Fusion Mushroom Bars EU already uses. A Fusion chocolate bar, an artisan chocolate bar, and a mushroom bar are the same confection. Gummies and curator boxes are other formats in the shop. Definitions stay with the published product page.
          </QuickAnswer>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10" aria-labelledby="glossary-terms">
        <h2 id="glossary-terms" className="font-serif text-2xl font-bold text-[#121212]">Which terms does the shop define?</h2>
        <dl className="mt-8 space-y-8">
          {TERMS.map((entry) => (
            <div key={entry.term}>
              <dt className="font-serif text-xl font-bold text-[#121212]">{entry.term}</dt>
              <dd className="mt-2 text-sm sm:text-base text-[#5C5852] leading-relaxed">{entry.definition}</dd>
            </div>
          ))}
        </dl>
        <h2 id="encyclopedia" className="mt-12 font-serif text-2xl font-bold text-[#121212]">Which subjects have an encyclopedia entry?</h2>
        <p className="mt-3 text-sm text-[#5C5852] leading-relaxed">{BRAND_ENCYCLOPEDIA.reason}</p>
        <ul className="mt-6 space-y-4">
          {SUBJECT_ENTITIES.map((entity) => (
            <li key={entity.wikidata} className="text-sm text-[#5C5852]">
              <span className="font-semibold text-[#121212]">{entity.name}</span>
              {' · '}
              <a href={entity.wikipedia} className="font-semibold text-[#4A5D4E] hover:underline" rel="noopener noreferrer">Wikipedia</a>
              {' · '}
              <a href={entity.wikidata} className="font-semibold text-[#4A5D4E] hover:underline" rel="noopener noreferrer">Wikidata</a>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm text-[#5C5852]">
          <Link href={`/${locale}/news/fusion-chocolate-bar`} className="font-semibold text-[#4A5D4E] hover:underline">What a Fusion chocolate bar is</Link>
          {' · '}
          <Link href={`/${locale}/compare`} className="font-semibold text-[#4A5D4E] hover:underline">How do the formats compare?</Link>
        </p>
      </section>
    </div>
  );
}
