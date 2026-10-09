import type { Metadata } from 'next';
import Link from 'next/link';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import QuickAnswer from '@/components/seo/QuickAnswer';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface ComparePageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: ComparePageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/compare`,
    title: 'Compare the range | Fusion Mushroom Bars EU',
    description:
      'How a Fusion chocolate bar, a fruit pectin gummy, and a curator box differ on this shop. Same checkout. Different format.',
  });
}

export default async function ComparePage({ params }: ComparePageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Compare', path: '/en/compare' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212]">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Compare</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">How do the formats compare?</h1>
          <QuickAnswer className="mt-6 rounded-2xl border border-[#E5E3DD] bg-white px-5 py-4">
            This page compares formats this shop sells: a Fusion chocolate bar, a fruit pectin gummy, and a curator box. It does not rank other websites. Payment and European dispatch are shared. The product page still holds the flavour, the price, and the ingredient list.
          </QuickAnswer>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10" aria-labelledby="compare-table">
        <h2 id="compare-table" className="font-serif text-2xl font-bold text-[#121212]">What is different, and what is shared?</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E5E3DD] bg-white">
          <table className="w-full text-left text-sm text-[#5C5852]">
            <thead className="bg-[#FBFBF9] text-[#121212]">
              <tr>
                <th className="px-4 py-3 font-semibold">Question</th>
                <th className="px-4 py-3 font-semibold">Chocolate bar</th>
                <th className="px-4 py-3 font-semibold">Gummies</th>
                <th className="px-4 py-3 font-semibold">Curator box</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#E5E3DD]">
                <th className="px-4 py-3 font-semibold text-[#121212]">What is it?</th>
                <td className="px-4 py-3">Scored chocolate on Belgian couverture and cocoa butter.</td>
                <td className="px-4 py-3">A fruit pectin chew from the same shop.</td>
                <td className="px-4 py-3">A packed selection. The published 10-bar tasting box is one of them.</td>
              </tr>
              <tr className="border-t border-[#E5E3DD]">
                <th className="px-4 py-3 font-semibold text-[#121212]">What published price is stated?</th>
                <td className="px-4 py-3">€20 for the single bar named on the homepage, or £17.50 in pounds. A collaboration page can print another price.</td>
                <td className="px-4 py-3">The amount on that gummy’s product page.</td>
                <td className="px-4 py-3">€150 for the 10-bar tasting box, or £128 in pounds.</td>
              </tr>
              <tr className="border-t border-[#E5E3DD]">
                <th className="px-4 py-3 font-semibold text-[#121212]">Is it a treatment?</th>
                <td className="px-4 py-3">No. It is a confection.</td>
                <td className="px-4 py-3">No. It is not a supplement.</td>
                <td className="px-4 py-3">No. It is a selection of confections.</td>
              </tr>
              <tr className="border-t border-[#E5E3DD]">
                <th className="px-4 py-3 font-semibold text-[#121212]">How do I pay?</th>
                <td className="px-4 py-3" colSpan={3}>Bank transfer from €100 of merchandise, or £100 in pounds. Bitcoin, Ethereum, and Bitcoin Cash take 10% off the merchandise only.</td>
              </tr>
              <tr className="border-t border-[#E5E3DD]">
                <th className="px-4 py-3 font-semibold text-[#121212]">Where does it ship?</th>
                <td className="px-4 py-3" colSpan={3}>European addresses checkout accepts, from hubs in the Netherlands, Spain, Germany, and France. Standard shipping is free from €300 of merchandise, or £260 in pounds.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <section aria-labelledby="compare-next" className="space-y-3 text-sm">
          <h2 id="compare-next" className="font-serif text-2xl font-bold text-[#121212]">Where do I order?</h2>
          <ol className="list-decimal pl-5 space-y-2 text-[#5C5852]">
            <li>Open the <Link href={`/${locale}/shop`} className="font-semibold text-[#4A5D4E] hover:underline">shop</Link> and choose the format.</li>
            <li>Read that product page. It is the description that passed review.</li>
            <li>Add it to the bag and check out with an address the store can serve.</li>
          </ol>
        </section>
      </section>
    </div>
  );
}
