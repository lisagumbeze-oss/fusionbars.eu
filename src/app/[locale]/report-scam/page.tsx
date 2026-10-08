import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';
import { STORE_ADDRESS_LINE, UK_BRANCH_OFFICE_LINE } from '@/lib/store-address';

interface ReportScamPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: ReportScamPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/report-scam`,
    title: 'Report a Scam Site | Fusion Mushroom Bars EU',
    description:
      'Confirm you are on fusionbars.eu before you pay, and report a website that impersonates Fusion Mushroom Bars EU.',
  });
}

export default async function ReportScamPage({ params }: ReportScamPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const supportEmail = AdminOverrides.settings().supportEmail;

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Report a scam site', path: '/en/report-scam' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Report a scam site</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">
            Report a site claiming to be Fusion Bars
          </h1>
          <p className="mt-5 text-sm sm:text-base text-[#5C5852] leading-relaxed max-w-xl">
            Fusion Mushroom Bars EU is the European shop at fusionbars.eu for hand-finished chocolate bars, fruit pectin gummies, and curator boxes. Confirm that address before you pay.
          </p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 text-sm text-[#5C5852] leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">This store</h2>
          <p>
            Orders for this catalogue are placed at{' '}
            <a href="https://fusionbars.eu" className="text-[#121212] underline underline-offset-2">https://fusionbars.eu</a>
            . The store is at {STORE_ADDRESS_LINE}. The UK branch office is at {UK_BRANCH_OFFICE_LINE}. Check the website address in the browser before checkout. Prices are shown in euro, with a pound option. Payment is bank transfer or cryptocurrency. Card numbers are not collected. Parcels leave hubs in the Netherlands, Spain, Germany, and France.
          </p>
          <p>
            A page on another Fusion site, with another address and another currency, is a different shop. A similar name, a street address in the United States, or a checkout that asks for a card or PayPal is not this store.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">If a site took your payment</h2>
          <p>
            If a website claiming to sell Fusion chocolate bars, mushroom bars, or gummies took a payment and was not fusionbars.eu, send the report to the support desk. Include:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>The website address of the other shop</li>
            <li>A screenshot of the payment confirmation</li>
            <li>Screenshots of the messages, whether email, chat, or social media</li>
            <li>The order confirmation, if you received one</li>
            <li>Any other record of the payment</li>
          </ul>
          <p>
            Send that to{' '}
            <a href={`mailto:${supportEmail}`} className="text-[#121212] underline underline-offset-2">{supportEmail}</a>
            . The desk reviews the report and replies from this store. A payment made on another website stays with that website and its payment provider.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Names that get copied</h2>
          <p>
            Impersonation often uses a close spelling or a rearranged name: Fusion Bar, Fusion Bars, mushroom bars, or shroom bars. The catalogue on this site is the one to use for a European order. Shipping, refunds, and support for that order stay on fusionbars.eu.
          </p>
          <p>
            Dispatch is described on{' '}
            <Link href={`/${locale}/shipping`} className="text-[#121212] underline underline-offset-2">Shipping & delivery</Link>
            . A problem with an order placed here is handled on the{' '}
            <Link href={`/${locale}/refunds`} className="text-[#121212] underline underline-offset-2">Refund policy</Link>
            .
          </p>
        </section>
      </article>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E5E3DD] bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#121212]">Send a report</h2>
            <p className="mt-2 text-sm text-[#5C5852] leading-relaxed">
              Write to{' '}
              <a href={`mailto:${supportEmail}`} className="text-[#121212] underline underline-offset-2 inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {supportEmail}
              </a>
              {' '}with the website address and the screenshots, or open the support desk.
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
