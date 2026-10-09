import type { Metadata } from 'next';
import Link from 'next/link';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import QuickAnswer from '@/components/seo/QuickAnswer';
import { CUSTOMER_RATINGS } from '@/domain/content/public-trust';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface ReviewsPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: ReviewsPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/reviews`,
    title: 'Customer ratings | Fusion Mushroom Bars EU',
    description: 'Fusion Mushroom Bars EU does not publish a customer star rating. Catalogue review is not a buyer score.',
  });
}

export default async function ReviewsPage({ params }: ReviewsPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Customer ratings', path: '/en/reviews' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212]">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Customer ratings</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">Are there customer star ratings?</h1>
          <QuickAnswer className="mt-6 rounded-2xl border border-[#E5E3DD] bg-white px-5 py-4">{CUSTOMER_RATINGS.reason}</QuickAnswer>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6" aria-labelledby="ratings-status">
        <h2 id="ratings-status" className="font-serif text-2xl font-bold text-[#121212]">What is published?</h2>
        <p className="text-sm sm:text-base text-[#5C5852] leading-relaxed">
          Nothing on this page is a star score. There is no average, no review count, and no list of buyer comments. A product page is the description that passed catalogue review.
        </p>
        <p className="text-sm">
          <Link href={`/${locale}/shop`} className="font-semibold text-[#4A5D4E] hover:underline">Shop the collection</Link>
          {' · '}
          <Link href={`/${locale}/about#shop-desk`} className="font-semibold text-[#4A5D4E] hover:underline">Who writes the shop notes</Link>
        </p>
      </section>
    </div>
  );
}
