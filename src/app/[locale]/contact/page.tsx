import type { Metadata } from 'next';
import ContactDesk from './ContactDesk';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { breadcrumbList } from '@/lib/structured-data';

interface ContactPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}/contact`,
    title: 'Customer Support | Fusion Mushroom Bars EU',
    description:
      'European support desk for Fusion Mushroom Bars EU. Order questions, wholesale allocations, and product inquiries.',
  });
}

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: 'Home', path: '/en' }, { name: 'Customer Support', path: '/en/contact' }])} />
      <ContactDesk />
    </>
  );
}
