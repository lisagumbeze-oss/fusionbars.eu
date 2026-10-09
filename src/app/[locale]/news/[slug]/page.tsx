import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SUPPORTED_LOCALES } from '@/i18n';
import { getNewsPost, NEWS_POSTS } from '@/domain/content/news-posts';
import NewsShell, { relatedPosts } from '@/components/news/NewsShell';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { KEYWORD_LINKS } from '@/lib/page-link-index';
import { articleJsonLd, breadcrumbList } from '@/lib/structured-data';
import AuthorBio from '@/components/seo/AuthorBio';
import QuickAnswer from '@/components/seo/QuickAnswer';

interface NewsArticleProps {
  params: Promise<{ locale: string; slug: string }> | { locale: string; slug: string };
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) => NEWS_POSTS.map((post) => ({ locale, slug: post.slug })));
}

export async function generateMetadata({ params }: NewsArticleProps): Promise<Metadata> {
  const resolved = await params;
  const post = getNewsPost(resolved.slug);
  if (!post) return { title: 'News | Fusion Mushroom Bars EU', robots: { index: false, follow: false } };
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/news/${post.slug}`,
    title: `${post.title} | Fusion Mushroom Bars EU`,
    description: post.summary,
    openGraphType: 'article',
  });
}

export default async function NewsArticlePage({ params }: NewsArticleProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const post = getNewsPost(resolved.slug);
  if (!post) notFound();
  const more = relatedPosts(post.slug);

  return (
    <article className="pb-8">
      <JsonLd data={articleJsonLd(post)} />
      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/en' },
          { name: 'News', path: '/en/news' },
          { name: post.title, path: `/en/news/${post.slug}` },
        ])}
      />
      <header className="border-b border-[#E5E3DD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/news`} className="hover:text-[#121212] transition">News</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium truncate">{post.title}</span>
          </nav>
          <p className="mt-8 text-[11px] font-semibold tracking-wider uppercase text-[#4A5D4E]">{post.kicker} · {post.date}</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">{post.title}</h1>
          <p className="mt-5 max-w-2xl text-sm sm:text-base text-[#5C5852] leading-relaxed">{post.summary}</p>
          <QuickAnswer className="mt-6 max-w-2xl rounded-2xl border border-[#E5E3DD] bg-white px-5 py-4">{post.answer}</QuickAnswer>
        </div>
      </header>

      <NewsShell locale={locale} currentSlug={post.slug}>
        <div className="space-y-10 text-sm sm:text-[15px] text-[#5C5852] leading-relaxed">
          {post.sections.map((section) => (
            <section key={section.heading} id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} className="space-y-4">
              <h2 className="font-serif text-2xl font-bold text-[#121212]">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <AuthorBio locale={locale} />

          <section className="border-t border-[#E5E3DD] pt-8">
            <h2 className="font-serif text-2xl font-bold text-[#121212]">Where do I read this in the shop?</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href={`/${locale}/shop`} className="font-semibold text-[#4A5D4E] hover:underline">
                  European artisan collection
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/faq`} className="font-semibold text-[#4A5D4E] hover:underline">
                  Ordering, payment, and dispatch
                </Link>
              </li>
              {KEYWORD_LINKS.filter((link) => link.path !== `/news/${post.slug}`).map((link) => (
                <li key={`${link.path}:${link.label}`}>
                  <Link href={`/${locale}${link.path}`} className="font-semibold text-[#4A5D4E] hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-[#E5E3DD] pt-8">
            <h2 className="font-serif text-2xl font-bold text-[#121212]">What should I read next?</h2>
            <ul className="mt-4 space-y-3">
              {more.map((item) => (
                <li key={item.slug}>
                  <Link href={`/${locale}/news/${item.slug}`} className="font-semibold text-[#4A5D4E] hover:underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </NewsShell>
    </article>
  );
}
