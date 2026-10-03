import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { NEWS_POSTS } from '@/domain/content/news-posts';
import NewsShell from '@/components/news/NewsShell';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface NewsPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/news`,
    title: 'News | Fusion Mushroom Bars EU',
    description:
      'Store notes from Fusion Mushroom Bars EU on the gummies, the chocolate bars, European dispatch, and how an order is placed.',
  });
}

export default async function NewsPage({ params }: NewsPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const [lead, ...rest] = NEWS_POSTS;

  return (
    <div className="pb-8">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'News', path: '/en/news' }])} />
      <header className="border-b border-[#E5E3DD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">News</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212]">News</h1>
          <p className="mt-5 max-w-2xl text-sm sm:text-base text-[#5C5852] leading-relaxed">
            Notes for the European store: the bars, the gummies, how a parcel leaves, and how to read a product page.
          </p>
        </div>
      </header>

      <NewsShell locale={locale}>
        <div className="space-y-8">
          {lead && (
            <article className="rounded-2xl border border-[#E5E3DD] bg-white p-6 sm:p-8">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-[#4A5D4E]">{lead.kicker} · {lead.date}</p>
              <h2 className="mt-3 font-serif text-3xl font-bold text-[#121212]">
                <Link href={`/${locale}/news/${lead.slug}`} className="hover:text-[#4A5D4E]">{lead.title}</Link>
              </h2>
              <p className="mt-3 text-sm text-[#5C5852] leading-relaxed">{lead.summary}</p>
              <Link href={`/${locale}/news/${lead.slug}`} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#4A5D4E] hover:underline">
                Read the article <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </article>
          )}
          <div className="divide-y divide-[#E5E3DD] border-y border-[#E5E3DD]">
            {rest.map((post) => (
              <article key={post.slug} className="py-6">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-[#4A5D4E]">{post.kicker} · {post.date}</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-[#121212]">
                  <Link href={`/${locale}/news/${post.slug}`} className="hover:text-[#4A5D4E]">{post.title}</Link>
                </h2>
                <p className="mt-2 text-sm text-[#5C5852] leading-relaxed">{post.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </NewsShell>
    </div>
  );
}
