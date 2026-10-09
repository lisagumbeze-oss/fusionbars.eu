import Link from 'next/link';
import type { ReactNode } from 'react';
import { NEWS_POSTS, type NewsPost } from '@/domain/content/news-posts';

export default function NewsShell({
  locale,
  currentSlug,
  children,
}: {
  locale: string;
  currentSlug?: string;
  children: ReactNode;
}) {
  const recent = NEWS_POSTS.filter((post) => post.slug !== currentSlug).slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        <div className="lg:col-span-8 min-w-0">{children}</div>
        <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-8" aria-label="Journal sidebar">
          <section className="rounded-2xl border border-[#E5E3DD] bg-white p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D4E]">Which notes were published recently?</h2>
            <ul className="mt-4 space-y-4">
              {recent.map((post) => (
                <li key={post.slug}>
                  <Link href={`/${locale}/news/${post.slug}`} className="group block">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8E8B85]">{post.date}</span>
                    <span className="mt-1 block font-serif text-base font-bold text-[#121212] group-hover:text-[#4A5D4E] leading-snug">{post.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E5E3DD] bg-[#FBFBF9] p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D4E]">Where is this in the shop?</h2>
            <ul className="mt-4 space-y-2 text-sm text-[#5C5852]">
              <li><Link href={`/${locale}/shop?category=artisan-chocolate-bars`} className="hover:text-[#121212]">Chocolate bars</Link></li>
              <li><Link href={`/${locale}/shop?category=gummies`} className="hover:text-[#121212]">Gummies</Link></li>
              <li><Link href={`/${locale}/shop?category=bundles-collections`} className="hover:text-[#121212]">Collections</Link></li>
              <li><Link href={`/${locale}/shop`} className="hover:text-[#121212]">All products</Link></li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E5E3DD] bg-white p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#4A5D4E]">Where else can I read?</h2>
            <ul className="mt-4 space-y-2 text-sm text-[#5C5852]">
              <li><Link href={`/${locale}/about`} className="hover:text-[#121212]">About</Link></li>
              <li><Link href={`/${locale}/faq`} className="hover:text-[#121212]">FAQs</Link></li>
              <li><Link href={`/${locale}/shipping`} className="hover:text-[#121212]">Shipping & returns</Link></li>
              <li><Link href={`/${locale}/refunds`} className="hover:text-[#121212]">Refund policy</Link></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-[#121212]">Contact</Link></li>
              <li><Link href={`/${locale}/terms`} className="hover:text-[#121212]">Terms</Link></li>
              <li><Link href={`/${locale}/report-scam`} className="hover:text-[#121212]">Report a scam site</Link></li>
              <li><Link href={`/${locale}/orders/lookup`} className="hover:text-[#121212]">Order status</Link></li>
              <li><Link href={`/${locale}/news`} className="hover:text-[#121212]">All news</Link></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function relatedPosts(currentSlug: string): NewsPost[] {
  const index = NEWS_POSTS.findIndex((post) => post.slug === currentSlug);
  if (index < 0) return NEWS_POSTS.slice(0, 3);
  return [1, 2, 3].map((step) => NEWS_POSTS[(index + step) % NEWS_POSTS.length]);
}
