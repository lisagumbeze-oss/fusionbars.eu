import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { LocaleCode } from '@/types';
import { publicPageMetadata } from '@/lib/page-metadata';

interface PrivacyPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/privacy`,
    title: 'Privacy | Fusion Mushroom Bars EU',
    description:
      'How Fusion Mushroom Bars EU uses the name, address, email, and phone number collected to ship an order, send order mail, and handle an account request.',
  });
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const resolved = await params;
  const locale = (resolved.locale as LocaleCode) || 'en';
  const supportEmail = AdminOverrides.settings().supportEmail;

  return (
    <div className="pb-16">
      <section className="border-b border-[#E5E3DD]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">Privacy</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#121212]">Privacy</h1>
          <p className="mt-5 text-sm sm:text-base text-[#5C5852] leading-relaxed">
            Using Fusion Mushroom Bars EU means this notice applies to the information you give this store. If the notice changes, the new text is published on this page.
          </p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 text-sm text-[#5C5852] leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Your privacy</h2>
          <p>
            The name, delivery address, email, and phone number you enter are used to run the order. They are not sold. Card numbers are not collected or stored. Payment on this store is bank transfer or cryptocurrency.
          </p>
          <p>
            Order mail is sent through the store’s email service. A courier receives the delivery details needed to hand over the parcel. This notice does not cover other websites you open from a link.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">What we use it for</h2>
          <p>
            Checkout asks for the details required to ship the order. Your email is used for order and payment messages, and for support if you write to us about that order. A phone number, when you provide one, can be passed to the courier so they can contact you about the delivery.
          </p>
          <p>
            The newsletter field stores an email address only when you submit it. That submission sends a confirmation to the address you entered and to the support desk.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Storage on this site</h2>
          <p>
            Necessary storage keeps the session and the bag working. Currency and wishlist stay in this browser only if you allow preferences. Analytics and marketing stay off unless you allow them, and no analytics or marketing tracker is configured.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-[#121212]">Access and deletion</h2>
          <p>
            A signed-in customer can request a copy of the account information held for that login. An account deletion removes the profile and saved addresses. Order totals are kept, and the name, email, phone, and street address on those orders are replaced so the record is no longer tied to you.
          </p>
          <p>
            Write to{' '}
            <a href={`mailto:${supportEmail}`} className="text-[#121212] underline underline-offset-2">{supportEmail}</a>
            {' '}for an access or deletion request, or use the{' '}
            <Link href={`/${locale}/account`} className="text-[#121212] underline underline-offset-2">account</Link>
            {' '}page when you are signed in.
          </p>
        </section>
      </article>
    </div>
  );
}
