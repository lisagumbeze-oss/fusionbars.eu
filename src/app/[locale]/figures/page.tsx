import type { Metadata } from 'next';
import Link from 'next/link';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import QuickAnswer from '@/components/seo/QuickAnswer';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface FiguresPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

const ROWS = [
  ['Single Fusion chocolate bar, as stated on the homepage', '€20, or £17.50 when pounds are shown'],
  ['10-bar tasting box, as stated on the homepage', '€150, or £128 when pounds are shown'],
  ['Bank transfer minimum', '€100 of merchandise, or £100 in pounds'],
  ['Cryptocurrency reduction', '10% off the merchandise subtotal. Shipping is not reduced.'],
  ['Cryptocurrency accepted', 'Bitcoin, Ethereum, and Bitcoin Cash'],
  ['Free standard shipping', 'From €300 of merchandise, or £260 in pounds'],
  ['Standard and express examples already printed for some European addresses', '€15 standard, €20 express. Checkout shows the figure for the address.'],
  ['Dispatch hubs', 'Netherlands, Spain, Germany, and France'],
  ['Return window already printed', 'Write within 7 days of delivery for damage, a defect, or a wrong item'],
  ['Approved refund timing already printed', '5–7 business days, by bank transfer or in the cryptocurrency used'],
] as const;

export async function generateMetadata({ params }: FiguresPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/figures`,
    title: 'Shop figures | Fusion Mushroom Bars EU',
    description:
      'Prices, payment thresholds, and shipping figures Fusion Mushroom Bars EU already publishes. Not an industry survey.',
  });
}

export default async function FiguresPage({ params }: FiguresPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Shop figures', path: '/en/figures' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212]">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Shop figures</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">Which figures does this shop publish?</h1>
          <QuickAnswer className="mt-6 rounded-2xl border border-[#E5E3DD] bg-white px-5 py-4">
            These are the store’s own prices and thresholds, copied from pages already on fusionbars.eu. A single stated bar is €20. The 10-bar tasting box is €150. Bank transfer starts at €100 of merchandise. Cryptocurrency takes 10% off that merchandise. This page is not a market-size report.
          </QuickAnswer>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8" aria-labelledby="figure-table">
        <h2 id="figure-table" className="font-serif text-2xl font-bold text-[#121212]">What numbers are already on the site?</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E5E3DD] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FBFBF9] text-[#121212]">
              <tr>
                <th className="px-4 py-3 font-semibold">Figure</th>
                <th className="px-4 py-3 font-semibold">Published value</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, value]) => (
                <tr key={label} className="border-t border-[#E5E3DD] text-[#5C5852]">
                  <th className="px-4 py-3 font-semibold text-[#121212]">{label}</th>
                  <td className="px-4 py-3">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section aria-labelledby="figure-sources" className="space-y-3 text-sm text-[#5C5852] leading-relaxed">
          <h2 id="figure-sources" className="font-serif text-2xl font-bold text-[#121212]">Which outside pages does the shop cite?</h2>
          <p>ISO/IEC 17025, the International Cocoa Organization, and EU food information for consumers. Those three links are in the references at the bottom of the page. They are not sales statistics for this shop.</p>
          <p>A product page can print a different price from the €20 bar. That page is the price for that item. Delivery days are not published here.</p>
        </section>
      </section>
    </div>
  );
}
