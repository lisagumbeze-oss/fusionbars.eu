import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface ShippingPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: ShippingPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/shipping`,
    title: 'Shipping & Returns | Fusion Mushroom Bars EU',
    description:
      'How Fusion Mushroom Bars EU packs and dispatches orders from the Netherlands, Spain, Germany, and France, and how to ask about a damaged or incomplete parcel.',
  });
}

export default async function ShippingPage({ params }: ShippingPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const supportEmail = AdminOverrides.settings().supportEmail;

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Shipping & returns', path: '/en/shipping' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Shipping & returns</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">
            Shipping & delivery
          </h1>
          <p className="mt-5 text-sm sm:text-base text-[#5C5852] leading-relaxed max-w-xl">
            Fusion Mushroom Bars EU packs chocolate bars, fruit pectin gummies, and curator boxes for European addresses. Parcels leave temperature-controlled hubs in the Netherlands, Spain, Germany, and France.
          </p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 text-sm text-[#5C5852] leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Order processing</h2>
          <p>
            Place the order on this site. Payment is bank transfer or cryptocurrency. Card numbers are not collected or stored. Bank transfer is offered when the merchandise total is at least €100, or £100 when prices are shown in pounds. Bitcoin, Ethereum, and Bitcoin Cash take 10% off the merchandise subtotal. Shipping is not discounted.
          </p>
          <p>
            Packing starts after payment is confirmed. Checkout asks for a telephone number so the courier can complete the delivery. Each order is packed to keep the chocolate intact on the way out of the hub.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Where we ship</h2>
          <p>
            The store is set up for European addresses, including the EU, the United Kingdom, and the other European destinations shown at checkout. The United States, Canada, and other countries outside that list are not offered.
          </p>
          <p>
            The hub follows the destination. A Dutch, Belgian, Luxembourg, or Nordic address is served from the Netherlands. Spain and Portugal from Spain. Germany, Austria, Switzerland, and several central European addresses from Germany. France, Italy, Ireland, and the United Kingdom from France. A product can still be unavailable for a particular address. Checkout says so before the order is completed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Shipping methods</h2>
          <p>
            Checkout offers Standard Discreet Courier. Express Priority Courier appears where that address allows it. Standard shipping is free once the merchandise reaches €300, or £260 when prices are shown in pounds. Express is not included in that threshold.
          </p>
          <p>
            The methods and the price for the address you enter are the ones checkout shows. Transit depends on the destination and the method. This page does not publish a fixed number of delivery days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Order tracking</h2>
          <p>
            After the order is saved, look it up on the{' '}
            <Link href={`/${locale}/orders/lookup`} className="text-[#121212] underline underline-offset-2">Order Status</Link>
            {' '}page with the order number. When a shipment reference has been recorded, it is included in the shipping email and on that order.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Packaging and discretion</h2>
          <p>
            Parcels leave in plain packaging. The outer carton is unmarked, the sender line is generic, and there is no botanical print on the outside. The hubs are temperature-controlled so the chocolate travels as chocolate.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Returns</h2>
          <p>
            Damaged, defective, and incorrect orders are covered on the{' '}
            <Link href={`/${locale}/refunds`} className="text-[#121212] underline underline-offset-2">Refund policy</Link>
            . Write within 7 days of delivery and wait for approval before sending anything back. An order can be cancelled before it ships.
          </p>
          <p>
            A refund is issued only after payment has been confirmed. An order that is still waiting for a bank transfer or a cryptocurrency payment is not refunded, because those funds have not been confirmed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">This store</h2>
          <p>
            Orders for this catalogue are placed at fusionbars.eu. Payment and delivery run through this checkout. A page on another Fusion site, with another address and another currency, is a different shop.
          </p>
        </section>
      </article>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E5E3DD] bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#121212]">Need help with an order?</h2>
            <p className="mt-2 text-sm text-[#5C5852] leading-relaxed">
              Write to{' '}
              <a href={`mailto:${supportEmail}`} className="text-[#121212] underline underline-offset-2 inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {supportEmail}
              </a>
              , or open the support desk. Short answers on dispatch also sit on the FAQ.
            </p>
          </div>
          <div className="flex flex-col sm:items-stretch gap-2 shrink-0">
            <Link
              href={`/${locale}/contact`}
              className="px-5 py-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold tracking-wide transition inline-flex items-center justify-center gap-2"
            >
              Contact support <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/${locale}/faq`}
              className="px-5 py-3 rounded-lg border border-[#E5E3DD] text-[#121212] text-xs font-semibold tracking-wide transition text-center hover:bg-[#F0F4F1]"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
