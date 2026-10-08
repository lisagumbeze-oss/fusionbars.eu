import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface RefundsPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: RefundsPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/refunds`,
    title: 'Refund Policy | Fusion Mushroom Bars EU',
    description:
      'How to return a damaged or incorrect Fusion Mushroom Bars EU order, when an exchange is possible, and how an approved refund is paid.',
  });
}

export default async function RefundsPage({ params }: RefundsPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const supportEmail = AdminOverrides.settings().supportEmail;

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Refund policy', path: '/en/refunds' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Refund policy</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">
            Refund & return policy
          </h1>
          <p className="mt-5 text-sm sm:text-base text-[#5C5852] leading-relaxed max-w-xl">
            Fusion Mushroom Bars EU wants a damaged, defective, or incorrect order put right. This note covers chocolate bars, fruit pectin gummies, and curator boxes dispatched from Europe.
          </p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 text-sm text-[#5C5852] leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Returns</h2>
          <p>
            If you receive a damaged, defective, or incorrect product, write to the support desk within 7 days of delivery. Use the{' '}
            <Link href={`/${locale}/contact`} className="text-[#121212] underline underline-offset-2">contact page</Link>
            {' '}and include the order number. A return has to be approved before anything is sent back. The desk may ask for photographs of the parcel and the product.
          </p>
          <p>
            An order can be cancelled before it ships. After dispatch, use this return process.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Refunds</h2>
          <p>
            When a return arrives, it is inspected. The desk then writes to say whether the refund is approved. An approved refund is processed within 5–7 business days.
          </p>
          <p>
            Payment on this store is bank transfer or cryptocurrency. A bank transfer is returned by bank transfer. Bitcoin, Ethereum, or Bitcoin Cash is returned in the currency used for the order. Shipping charges are not refunded.
          </p>
          <p>
            A refund is issued only after payment has been confirmed. An order that is still waiting for a bank transfer or a cryptocurrency payment is not refunded, because those funds have not been confirmed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Exchanges</h2>
          <p>
            To exchange a product for another item in the shop, write to the support desk as soon as the order arrives. An exchange depends on the replacement being available. The same 7-day window and approval step apply before anything is sent back.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Items that cannot be returned</h2>
          <p>
            Opened consumables cannot be returned, for hygiene. That includes chocolate bars and gummies once the seal is broken. A bar or pouch that arrives damaged, defective, or different from the order can still be reported within 7 days, even if the seal was opened to check it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">This store</h2>
          <p>
            Orders for this catalogue are placed at fusionbars.eu. Refunds for those orders are handled by this support desk. A page on another Fusion site, with another address and another currency, is a different shop.
          </p>
          <p>
            Dispatch, hubs, and discreet packaging are described on the{' '}
            <Link href={`/${locale}/shipping`} className="text-[#121212] underline underline-offset-2">Shipping & delivery</Link>
            {' '}page.
          </p>
        </section>
      </article>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E5E3DD] bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#121212]">Need help with a refund?</h2>
            <p className="mt-2 text-sm text-[#5C5852] leading-relaxed">
              Write to{' '}
              <a href={`mailto:${supportEmail}`} className="text-[#121212] underline underline-offset-2 inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {supportEmail}
              </a>
              {' '}with the order number, or open the support desk.
            </p>
          </div>
          <Link
            href={`/${locale}/contact`}
            className="shrink-0 px-5 py-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold tracking-wide transition inline-flex items-center justify-center gap-2"
          >
            Contact support <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
