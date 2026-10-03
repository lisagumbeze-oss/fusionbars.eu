import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Mail, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { LocaleCode } from '@/types';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface AboutPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/about`,
    title: 'About Us | Fusion Mushroom Bars EU',
    description:
      'About Fusion Mushroom Bars EU. Belgian cacao and functional mycology, finished in European ateliers and dispatched discreetly from the Netherlands, Spain, Germany, and France.',
  });
}

const SECTIONS = [
  {
    label: '01',
    title: 'Our philosophy',
    body: 'A Fusion bar is a confection before it is anything else. Flavour, snap, and finish have to stand on their own. The botanical work is measured into that standard, so each piece stays consistent from the first square to the last.',
  },
  {
    label: '02',
    title: 'Craftsmanship and quality',
    body: 'Bars are built on Belgian couverture and cocoa butter, without palm oil or synthetic stabilisers. Pieces are finished in European ateliers in Barcelona and Amsterdam, and batches follow the same review standard published on the store: European GMP practice and ISO 17025 laboratory checks.',
  },
  {
    label: '03',
    title: 'Community and connection',
    body: 'Orders travel in plain, unmarked packaging from temperature-controlled hubs in the Netherlands, Spain, Germany, and France. Support stays with the European desk, whether the question is a flavour, a consignment, or a delivery.',
  },
  {
    label: '04',
    title: 'Looking ahead',
    body: 'The range grows through flavour, format, and curator boxes. A product reaches the shop after catalogue review, with the public description approved for that item. New work stays in that order.',
  },
] as const;

export default async function AboutPage({ params }: AboutPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const supportEmail = AdminOverrides.settings().supportEmail;

  return (
    <div className="pb-16">
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'About', path: '/en/about' }])} />
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">About</span>
          </nav>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
            <div className="lg:col-span-7 space-y-5">
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-[#4A5D4E] bg-[#F0F4F1] px-3 py-1 rounded-full border border-[#4A5D4E]/20">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Fusion Mushroom Bars EU
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212] leading-[1.1]">
                About Fusion Bars
              </h1>
              <p className="text-sm sm:text-base text-[#5C5852] leading-relaxed max-w-xl">
                Fusion Mushroom Bars EU is the European store for hand-finished botanical chocolate. Single-origin Belgian cacao and functional mycology meet in bars, gummies, and curator boxes, then leave from climate-controlled hubs across the Netherlands, Spain, Germany, and France.
              </p>
            </div>
            <div className="lg:col-span-5 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/shop`}
                className="px-5 py-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold tracking-wide transition inline-flex items-center gap-2"
              >
                Shop the collection <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="px-5 py-3 rounded-lg bg-white hover:bg-neutral-50 text-[#121212] border border-[#E5E3DD] text-xs font-semibold tracking-wide transition"
              >
                Contact the desk
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5 relative aspect-4/3 rounded-2xl bg-white border border-[#E5E3DD] overflow-hidden">
            <Image
              src="/images/products/reference/fusion-bars-display-cases.jpg"
              alt="Fusion chocolate bars in Heath, Cap'n Crunch, and Ferrero sleeves, with display cases"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs uppercase font-bold tracking-wider text-[#4A5D4E]">The European store</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212]">Crafted for this market.</h2>
            <p className="text-sm text-[#5C5852] leading-relaxed">
              The European store is built around a simple standard: a Fusion bar finished here, packed discreetly, and supported by a desk customers can reach. Quality, flavour, and a clear order path sit in front of everything else.
            </p>
            <p className="text-sm text-[#5C5852] leading-relaxed">
              What you see in the shop is the public range. Descriptions stay with the product that passed review. Pricing is shown in euro, with a pound display beside it when you switch currency.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-[#E5E3DD]" aria-labelledby="about-sections">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 id="about-sections" className="font-serif text-3xl font-bold text-[#121212]">How the house works</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECTIONS.map((section) => (
              <article key={section.label} className="rounded-2xl border border-[#E5E3DD] bg-[#FBFBF9] p-6 sm:p-8">
                <p className="text-[11px] font-semibold tracking-widest text-[#4A5D4E]">{section.label}</p>
                <h3 className="mt-3 font-serif text-2xl font-bold text-[#121212]">{section.title}</h3>
                <p className="mt-3 text-sm text-[#5C5852] leading-relaxed">{section.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-[#121212] text-[#FBFBF9] p-8 sm:p-10">
            <h2 className="font-serif text-3xl font-bold">A plain parcel, a known route.</h2>
            <ul className="mt-6 space-y-4 text-sm text-neutral-300">
              <li className="flex gap-3">
                <ShieldCheck className="w-4 h-4 mt-0.5 text-[#88A48D] shrink-0" aria-hidden="true" />
                <span>Neutral outer cartons, generic sender details, and no botanical marks on the parcel.</span>
              </li>
              <li className="flex gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-[#88A48D] shrink-0" aria-hidden="true" />
                <span>Dispatch from temperature-controlled hubs in the Netherlands, Spain, Germany, and France.</span>
              </li>
              <li className="flex gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-[#88A48D] shrink-0" aria-hidden="true" />
                <span>
                  Questions go to{' '}
                  <a href={`mailto:${supportEmail}`} className="text-white underline underline-offset-2">
                    {supportEmail}
                  </a>
                  .
                </span>
              </li>
            </ul>
          </div>
          <aside className="lg:col-span-5 rounded-2xl border border-[#E5E3DD] bg-white p-8 flex flex-col justify-between gap-8">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#121212]">Visit the desk</h2>
              <p className="mt-3 text-sm text-[#5C5852] leading-relaxed">
                Order questions, flavour notes, and consignment checks are handled on the support page. Company facts appear there only after they have been approved.
              </p>
            </div>
            <Link
              href={`/${locale}/contact`}
              className="text-xs font-semibold text-[#4A5D4E] hover:underline inline-flex items-center gap-1"
            >
              European customer support <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}
