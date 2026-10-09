import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';
import QuickAnswer from '@/components/seo/QuickAnswer';

interface FaqPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/faq`,
    title: 'FAQs | Fusion Mushroom Bars EU',
    description:
      'How to buy Fusion Bars in the United Kingdom, where to buy fusion chocolate in Austria, what a mushroom bar costs in Portugal, and how European dispatch works.',
  });
}

const FAQS = [
  {
    question: 'What are Fusion Bars?',
    answer:
      'Fusion Mushroom Bars EU sells hand-finished chocolate bars, fruit pectin gummies, and curator boxes. The bars pair Belgian cacao with functional mycology. The description on each product page is the one published for that item.',
  },
  {
    question: 'Are Fusion Bars safe to consume?',
    answer:
      'These are confectionery products. Read the published description on the product page before you order. The shop does not give medical advice, and a bar is not a treatment. If you need an ingredient question answered, write to the European support desk.',
  },
  {
    question: 'How do I use a Fusion bar?',
    answer:
      'Eat it as chocolate, when you want a piece. There is no daily serving, no half-bar starting plan, and no timetable for energy, focus, or recovery. Keep it cool, dry, and out of direct sun. The longer note is on the news page, under “How a bar is eaten here.”',
  },
  {
    question: 'Can Fusion Bars replace my regular supplements?',
    answer:
      'No. They are confections, not a supplement and not a replacement for one. The shop does not publish treatment, dosage, or wellness claims beyond the text already on the product page.',
  },
  {
    question: 'How do you ship my order?',
    answer:
      'Parcels leave from temperature-controlled hubs in the Netherlands, Spain, Germany, and France. The outer carton is plain and unmarked, with a generic sender and no botanical marks. Checkout offers Standard Discreet Courier, and Express Priority Courier where that address allows it. Standard shipping is free once the merchandise reaches €300, or £260 when prices are shown in pounds. The methods for your address appear at checkout. The longer note is on the Shipping & delivery page.',
  },
  {
    question: 'Can you guarantee the quality of the products?',
    answer:
      'Bars are built on Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers, and finished in European ateliers. The store’s published review standard is European GMP practice and ISO 17025 laboratory checks. A product is listed after catalogue review. That is the standard stated on the shop, not a separate certificate on this page.',
  },
  {
    question: 'Is buying on this site safe?',
    answer:
      'Checkout runs on this site, fusionbars.eu. Payment is bank transfer or cryptocurrency. Card numbers are not collected or stored. Use the support address below if an order or payment needs to be checked. A site using the Fusion name with another address is a different shop. How to confirm this store, and how to report an impersonating site, is on the Report a scam site page.',
  },
  {
    question: 'How do I place an order?',
    answer:
      'Add a product to your bag, open the bag, and continue to checkout. Enter the delivery address, then choose a payment method. Bank transfer is offered when the merchandise total is at least €100, or £100 in pounds. Cryptocurrency is Bitcoin, Ethereum, or Bitcoin Cash, and it takes 10% off the merchandise subtotal. Shipping is not discounted. After the order is saved, look it up on the Order Status page with the order number.',
  },
  {
    question: 'Can I return or exchange an order?',
    answer:
      'Write within 7 days of delivery if a product arrives damaged, defective, or incorrect. Wait for approval before sending anything back. Opened chocolate bars and gummies cannot be returned once the seal is broken, unless you opened it to check damage. An approved refund is processed within 5–7 business days, by bank transfer or in the cryptocurrency used for the order. Shipping charges are not refunded. The full note is on the Refund policy page.',
  },
  {
    question: 'Where do you ship?',
    answer:
      'The store is set up for European addresses, including the EU, the United Kingdom, and the other European destinations shown at checkout. The United States, Canada, and other countries outside that list are not offered. A product can still be unavailable for a particular address. Checkout says so instead of completing the delivery.',
  },
  {
    question: 'How to buy Fusion Bars in the United Kingdom',
    answer:
      'Add the product in the shop, open the bag, and continue to checkout with a UK address. The United Kingdom is one of the European destinations this store accepts, and the parcel leaves the France hub. Bank transfer is offered from €100, or £100 when prices are shown in pounds. Cryptocurrency takes 10% off the merchandise subtotal. Shipping is not discounted.',
  },
  {
    question: 'Where can I buy fusion chocolate in Austria?',
    answer:
      'Fusion chocolate is sold on this site. An Austrian address is served from the Germany hub. The flavour, the photograph, and the price are on the product page. Checkout confirms that the address can take the order.',
  },
  {
    question: 'How much for a mushroom bar in Portugal?',
    answer:
      'A mushroom bar is the Fusion chocolate bar, priced at €20, or £17.50 when the announcement bar shows pounds. A Portuguese address is packed from the Spain hub. Standard shipping is €15 and express is €20. Standard shipping is free from €300 of merchandise, or £260 in pounds.',
  },
  {
    question: 'Can I order Fusion Bars to Sweden?',
    answer:
      'Yes, when checkout accepts the address. Sweden is served from the Netherlands hub, with the same plain packaging and the same euro prices as the rest of the European list. A single bar is €20.',
  },
  {
    question: 'Do you ship artisan chocolate to Switzerland?',
    answer:
      'An address in Switzerland is routed through the Germany hub when the product can be delivered there. Artisan chocolate on this store is the Fusion bar range. Checkout is the confirmation. This page does not override a message that the destination or the product is unavailable.',
  },
] as const;

export default async function FaqPage({ params }: FaqPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const supportEmail = AdminOverrides.settings().supportEmail;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <div className="pb-16">
      <JsonLd data={schema} />
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'FAQs', path: '/en/faq' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">FAQs</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">
            Frequently asked questions
          </h1>
          <p className="mt-5 text-sm sm:text-base text-[#5C5852] leading-relaxed max-w-xl">
            Practical answers for the European store: how to buy, where an order can go, what a bar costs, and how a parcel leaves the hub.
          </p>
          <QuickAnswer className="mt-6 rounded-2xl border border-[#E5E3DD] bg-white px-5 py-4">
            Fusion Bars are chocolate bars, fruit pectin gummies, and curator boxes from this European shop. A stated single bar is €20. Eat it as chocolate. Parcels leave the Netherlands, Spain, Germany, or France. The shop does not replace a supplement and does not give medical advice.
          </QuickAnswer>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" aria-labelledby="faq-list">
        <h2 id="faq-list" className="sr-only">What are the questions?</h2>
        <div className="divide-y divide-[#E5E3DD] border-y border-[#E5E3DD]">
          {FAQS.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-start justify-between gap-6 font-serif text-lg sm:text-xl font-semibold text-[#121212] list-none [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="mt-1 text-[#4A5D4E] text-xl leading-none group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm text-[#5C5852] leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E5E3DD] bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#121212]">Still need an answer?</h2>
            <p className="mt-2 text-sm text-[#5C5852] leading-relaxed">
              Write to{' '}
              <a href={`mailto:${supportEmail}`} className="text-[#121212] underline underline-offset-2 inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {supportEmail}
              </a>
              , or open the support desk. Dispatch and returns are on{' '}
              <Link href={`/${locale}/shipping`} className="text-[#121212] underline underline-offset-2">Shipping & delivery</Link>.
            </p>
          </div>
          <Link
            href={`/${locale}/contact`}
            className="shrink-0 px-5 py-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold tracking-wide transition inline-flex items-center gap-2"
          >
            Contact support <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
