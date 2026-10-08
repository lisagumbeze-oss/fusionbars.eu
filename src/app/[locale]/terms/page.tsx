import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';
import { STORE_ADDRESS, UK_BRANCH_OFFICE_LINE } from '@/lib/store-address';

interface TermsPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/terms`,
    title: 'Terms & Conditions | Fusion Mushroom Bars EU',
    description:
      'Terms for using Fusion Mushroom Bars EU: orders, bank transfer and cryptocurrency, European dispatch, returns, and the store content.',
  });
}

export default async function TermsPage({ params }: TermsPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const supportEmail = AdminOverrides.settings().supportEmail;

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Terms & conditions', path: '/en/terms' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Terms & conditions</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">
            Terms & conditions
          </h1>
          <p className="mt-5 text-sm sm:text-base text-[#5C5852] leading-relaxed max-w-xl">
            Using fusionbars.eu means these terms apply to the European store. Read them with the shipping, refund, and privacy pages. If this page changes, the new text is published here.
          </p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 text-sm text-[#5C5852] leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">1. Use of the website</h2>
          <p>
            Use this website for lawful purposes. Do not interfere with another customer’s use of the shop, and do not damage the site or its content. Orders for this catalogue are placed at fusionbars.eu.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">2. Products</h2>
          <p>
            The shop sells hand-finished chocolate bars, fruit pectin gummies, and curator boxes. The description on each product page is the one published for that item. The shop does not give medical advice, and a bar is not a treatment.
          </p>
          <p>
            By ordering, you confirm that buying the product is permitted where you live. Age verification at delivery is not configured. Checkout accepts European addresses, including the EU and the United Kingdom, when the product and the destination allow it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">3. Orders and payment</h2>
          <p>
            Orders are placed through checkout on this site. Payment is bank transfer or cryptocurrency. Card numbers are not collected or stored. Bank transfer is offered when the merchandise total is at least €100, or £100 when prices are shown in pounds. Bitcoin, Ethereum, and Bitcoin Cash take 10% off the merchandise subtotal. Shipping is not discounted.
          </p>
          <p>
            The store can refuse or cancel an order when a product is unavailable, a price is wrong, or the payment looks fraudulent. An order can be cancelled before it ships. A refund is issued only after payment has been confirmed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">4. Shipping and delivery</h2>
          <p>
            Parcels leave temperature-controlled hubs in the Netherlands, Spain, Germany, and France. Checkout shows the courier method and the price for the address you enter. Transit depends on the destination and the method. Courier delays and events outside the hubs sit with the courier.
          </p>
          <p>
            The full dispatch note is on{' '}
            <Link href={`/${locale}/shipping`} className="text-[#121212] underline underline-offset-2">Shipping & delivery</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">5. Returns and refunds</h2>
          <p>
            Returns, exchanges, and refunds follow the{' '}
            <Link href={`/${locale}/refunds`} className="text-[#121212] underline underline-offset-2">Refund policy</Link>
            . A damaged, defective, or incorrect product must be reported within 7 days of delivery. Wait for approval before sending anything back. Shipping charges are not refunded.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">6. Store content</h2>
          <p>
            The text, photographs, graphics, and logo on this website belong to Fusion Mushroom Bars EU or its licensors. Copying, reproducing, or distributing that content needs written permission from the store.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">7. Problems with an order</h2>
          <p>
            A damaged, incorrect, or incomplete order is handled through the refund policy and the support desk. The product page remains the published description. Write to the desk with the order number if something in the order needs to be checked.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">8. Changes</h2>
          <p>
            The store can update these terms. The revised text is posted on this page. Continuing to use the website after that posting means the revised terms apply.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">9. Contact</h2>
          <p>
            The store address is {STORE_ADDRESS.lines.join(', ')}. The UK branch office is {UK_BRANCH_OFFICE_LINE}.
          </p>
          <p>
            Questions about these terms go to{' '}
            <a href={`mailto:${supportEmail}`} className="text-[#121212] underline underline-offset-2">{supportEmail}</a>
            {' '}or the{' '}
            <Link href={`/${locale}/contact`} className="text-[#121212] underline underline-offset-2">contact page</Link>
            . A site using the Fusion name with another address is a different shop. How to report one is on{' '}
            <Link href={`/${locale}/report-scam`} className="text-[#121212] underline underline-offset-2">Report a scam site</Link>.
          </p>
        </section>
      </article>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E5E3DD] bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#121212]">Questions about these terms?</h2>
            <p className="mt-2 text-sm text-[#5C5852] leading-relaxed">
              Write to{' '}
              <a href={`mailto:${supportEmail}`} className="text-[#121212] underline underline-offset-2 inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {supportEmail}
              </a>
              , or open the support desk.
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
