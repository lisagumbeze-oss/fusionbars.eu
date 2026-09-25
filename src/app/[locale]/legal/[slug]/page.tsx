import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EnvironmentService } from '@/config/environment';
import { LocaleCode } from '@/types';
import { Shield, FileText, ArrowLeft, Building2, Truck, RefreshCw, Cookie, Mail } from 'lucide-react';
import type { Metadata } from 'next';

interface LegalPageProps {
  params: Promise<{ locale: string; slug: string }> | { locale: string; slug: string };
}

interface LegalDocDefinition {
  title: string;
  subtitle: string;
  category: string;
  lastUpdated: string;
  sections: Array<{ heading: string; content: string[] }>;
}

function getLegalDoc(slug: string, config: ReturnType<typeof EnvironmentService.getConfig>): LegalDocDefinition | null {
  const { legal } = config;

  switch (slug) {
    case 'privacy':
      return {
        title: 'Privacy Policy & Data Protection',
        subtitle: 'European General Data Protection Regulation (GDPR) Technical Notice',
        category: 'Data Governance',
        lastUpdated: 'September 2026',
        sections: [
          {
            heading: '1. Data Controller Information',
            content: [
              `Entity Name: ${legal.companyName}`,
              `Registered Address: ${legal.registeredOffice}`,
              `Company Registration ID: ${legal.companyRegNumber}`,
              `VAT Identification: ${legal.vatNumber}`,
              `Data Protection Inquiries: ${legal.contactEmail}`,
            ],
          },
          {
            heading: '2. Principles of Data Collection',
            content: [
              'We collect and process customer personal information strictly under Article 6(1)(b) of the GDPR for the fulfilment of purchases, order delivery, and statutory tax compliance.',
              'Data categories collected: Identity data (name), delivery data (postal address), contact data (email, phone for courier exceptions), and financial audit references.',
              'We do NOT sell, rent, or monetize customer data. Customer records are retained only for the duration required by European commercial book-keeping mandates.',
            ],
          },
          {
            heading: '3. Technical Data Protection & Security Controls',
            content: [
              'All database queries are executed via encrypted TLS 1.3 connections.',
              'Customer session tokens are cryptographically signed using HMAC-SHA256 and stored in HttpOnly, SameSite=Strict cookies.',
              'Guest order records are protected against sequential probing by requiring dual-factor credentials (order number combined with recipient email address or cryptographically signed lookup token).',
            ],
          },
          {
            heading: '4. Rights of Data Subjects (GDPR Articles 15-22)',
            content: [
              'Right of Access (Art. 15): Customers may request a complete, machine-readable export of their personal profile, address records, and order history via their customer account dashboard.',
              'Right to Rectification (Art. 16): Delivery addresses and customer profile fields can be modified directly within the account portal.',
              'Right to Erasure (Art. 17): Customers may execute technical account erasure. Account profiles and saved addresses are permanently removed, and associated order records are anonymized to preserve statutory accounting totals.',
              'Right to Restriction & Object: Inquiries can be lodged directly to sales@fusionbars.eu.',
            ],
          },
        ],
      };

    case 'terms':
      return {
        title: 'Terms & Conditions of Service',
        subtitle: 'European E-Commerce Customer Agreement',
        category: 'Legal Terms',
        lastUpdated: 'September 2026',
        sections: [
          {
            heading: '1. Scope of Agreement',
            content: [
              `These General Terms and Conditions govern all sales of artisan botanical confections concluded via https://fusionbars.eu operated by ${legal.companyName}.`,
              'By placing an order, the customer affirms that they are at least 18 years of age and possess legal capacity to enter into binding agreements.',
            ],
          },
          {
            heading: '2. Product Specifications & Artisan Confectionery Notice',
            content: [
              'All confections distributed by Fusion Mushroom Bars EU are crafted with culinary-grade Belgian chocolate and certified European functional mushroom extracts (including Lion\'s Mane, Reishi, Cordyceps, and Chaga).',
              'Products are manufactured in registered European ateliers adhering to European Good Manufacturing Practice (GMP) and certified under ISO 17025 laboratory verification.',
              'Statements made on this website have not been evaluated by the European Medicines Agency (EMA). Products are not intended to diagnose, treat, cure, or prevent any disease.',
            ],
          },
          {
            heading: '3. Order Placement & Price Integrity',
            content: [
              'Orders are submitted as binding purchase offers once checkout is completed. Product prices are calculated server-side in Euro (€ EUR) or British Pounds (£ GBP).',
              'Client-side price tampering or modified basket totals are automatically rejected by server-authoritative recalculation engines.',
            ],
          },
          {
            heading: '4. Payment Terms & Settlement',
            content: [
              'Accepted payment mechanisms: Direct European Bank Transfer (SEPA / IBAN) and approved Cryptocurrency settlement rails.',
              'Orders remain in PENDING_PAYMENT status until receipt of verifiable transaction reference or banking clearance. Orders without verified payment within 7 calendar days are cancelled and reserved inventory is restored to availability.',
            ],
          },
        ],
      };

    case 'refunds':
      return {
        title: 'Refund & Returns Policy',
        subtitle: 'European Consumer Rights & Perishable Confections Standard',
        category: 'Customer Protection',
        lastUpdated: 'September 2026',
        sections: [
          {
            heading: '1. Perishable Goods Exemption (Directive 2011/83/EU, Art. 16(d))',
            content: [
              'Under European Union Consumer Rights regulations, the standard 14-day statutory right of withdrawal does not apply to goods that are liable to deteriorate rapidly or are sealed for health protection and hygiene once unsealed.',
              'Due to the perishable culinary nature and temperature sensitivity of artisan chocolate and functional pectin confections, sealed items cannot be returned once delivered.',
            ],
          },
          {
            heading: '2. Damaged or Defective Consignments',
            content: [
              'In the unlikely event that your parcel arrives damaged in transit or exhibits a verified manufacturing anomaly:',
              '1. Photograph the exterior packaging and the inner sealed confection within 48 hours of delivery.',
              '2. Submit photos along with your Order Reference Number to sales@fusionbars.eu.',
              '3. Following laboratory review, our operations team will dispatch a prompt complimentary replacement or issue a refund to the original payment rail.',
            ],
          },
          {
            heading: '3. Non-Delivery or Tracking Claims',
            content: [
              'If a dispatched consignment does not arrive within the maximum expected delivery window (10 business days for Western Europe, 14 business days for non-contiguous regions), contact customer support for courier investigation and priority re-shipment.',
            ],
          },
        ],
      };

    case 'shipping':
      return {
        title: 'European Shipping & Logistics Policy',
        subtitle: 'Multi-Hub Fulfilment from NL, ES, DE, and FR',
        category: 'Fulfilment Logistics',
        lastUpdated: 'September 2026',
        sections: [
          {
            heading: '1. Fulfilment Hub Network',
            content: [
              'Orders are fulfilled from four strategic climate-regulated logistics centers: Netherlands (NL Hub), Spain (ES Hub), Germany (DE Hub), and France (FR Hub).',
              'Internal routing algorithms assign consignments to the optimal logistics hub to minimize customs friction and transit durations.',
            ],
          },
          {
            heading: '2. Packaging & Discretion Policy',
            content: [
              'All consignments are dispatched in plain, unbranded, neutral outer corrugated cartons with tamper-evident security tape.',
              'Sender information is listed under generic European logistics fulfillment entities with zero botanical or confection markings.',
              'High-density insulated packaging with non-toxic thermal cooling packs is deployed during elevated summer temperatures to preserve chocolate temper.',
            ],
          },
          {
            heading: '3. Shipping Rates & Delivery Timeframes',
            content: [
              'Standard Courier: €15.00 (or £13.00) &bull; Estimated delivery 2–4 business days.',
              'Express Priority Courier: €20.00 (or £17.50) &bull; Estimated delivery 1–2 business days.',
              'Complimentary Shipping: Standard shipping is complimentary on all orders with a subtotal of €300.00 (£260.00) or greater.',
            ],
          },
        ],
      };

    case 'cookies':
      return {
        title: 'Cookie & Tracking Technology Policy',
        subtitle: 'Technical Statement on Client Storage & Session Integrity',
        category: 'Privacy & Cookies',
        lastUpdated: 'September 2026',
        sections: [
          {
            heading: '1. What Are Cookies and Local Storage?',
            content: [
              'Cookies are small text strings stored on your device that enable web applications to maintain session continuity, remember shopping cart items, and preserve locale selections.',
            ],
          },
          {
            heading: '2. Strictly Essential Cookies (Always Active)',
            content: [
              'fb_session: Cryptographically signed authentication session token (HttpOnly, Secure, SameSite=Strict). Required for customer login.',
              'fb_cart: Stores temporary cart identifiers to preserve selected confections while browsing.',
              'fb_currency / fb_locale: Preserves preferred currency (EUR/GBP) and language interface (en/de/fr/es/it/nl).',
              'fb_cookie_consent: Records customer consent preferences so banner prompts are not repeated.',
            ],
          },
          {
            heading: '3. Analytics & Performance Cookies (Optional)',
            content: [
              'Non-essential analytics technologies remain disabled until explicit affirmative consent is granted via the Cookie Preference Manager.',
              'We do not deploy third-party advertising tracking pixels or cross-site behavioral tracking cookies.',
            ],
          },
        ],
      };

    case 'imprint':
      return {
        title: 'Legal Notice / Imprint (Impressum)',
        subtitle: 'Statutory Corporate Disclosure pursuant to European E-Commerce Law',
        category: 'Legal Notice',
        lastUpdated: 'September 2026',
        sections: [
          {
            heading: '1. Company Details',
            content: [
              `Operating Company: ${legal.companyName}`,
              `Registered Address: ${legal.registeredOffice}`,
              `Commercial Register ID: ${legal.companyRegNumber}`,
              `VAT Identification: ${legal.vatNumber}`,
              `Supervisory Authority: ${legal.supervisoryAuthority}`,
            ],
          },
          {
            heading: '2. Contact Information',
            content: [
              `Electronic Mail: ${legal.contactEmail}`,
              'Online Customer Helpdesk: Monday – Friday (09:00 – 18:00 CET)',
              'Official Website: https://fusionbars.eu',
            ],
          },
          {
            heading: '3. Online Dispute Resolution (ODR)',
            content: [
              'The European Commission provides a platform for online dispute resolution (ODR): https://ec.europa.eu/consumers/odr.',
              'We are neither obligated nor committed to participate in dispute settlement proceedings before a consumer dispute resolution board.',
            ],
          },
        ],
      };

    default:
      return null;
  }
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const resolved = await params;
  const config = EnvironmentService.getConfig();
  const doc = getLegalDoc(resolved.slug, config);

  if (!doc) return { title: 'Legal Notice Not Found | Fusion EU' };

  return {
    title: `${doc.title} | Fusion Mushroom Bars EU`,
    description: doc.subtitle,
    alternates: {
      canonical: `https://fusionbars.eu/${resolved.locale}/legal/${resolved.slug}`,
    },
    openGraph: {
      title: `${doc.title} | Fusion Mushroom Bars EU`,
      description: doc.subtitle,
      url: `https://fusionbars.eu/${resolved.locale}/legal/${resolved.slug}`,
    },
  };
}

export default async function LegalSlugPage({ params }: LegalPageProps) {
  const resolved = await params;
  const config = EnvironmentService.getConfig();
  const doc = getLegalDoc(resolved.slug, config);

  if (!doc) {
    notFound();
  }

  const locale = (resolved.locale as LocaleCode) || 'en';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
        <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#121212] font-medium">Transparency & Legal</span>
        <span aria-hidden="true">/</span>
        <span className="text-[#4A5D4E] font-semibold">{doc.title}</span>
      </nav>

      {/* Header */}
      <div className="border-b border-[#E5E3DD] pb-8 space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#4A5D4E] bg-[#F0F4F1] px-3 py-1 rounded-full border border-[#4A5D4E]/20">
          <Shield className="w-3.5 h-3.5 text-[#4A5D4E]" />
          <span>{doc.category}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212] tracking-tight">
          {doc.title}
        </h1>
        <p className="text-sm text-[#5C5852] max-w-2xl leading-relaxed">
          {doc.subtitle} &bull; Effective Version: {doc.lastUpdated}
        </p>
      </div>

      {/* Document Sections */}
      <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 sm:p-10 space-y-8 shadow-xs divide-y divide-[#E5E3DD]">
        {doc.sections.map((section, idx) => (
          <div key={idx} className={idx === 0 ? 'space-y-4' : 'pt-8 space-y-4'}>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#121212]">
              {section.heading}
            </h2>
            <div className="space-y-2 text-xs sm:text-sm text-[#5C5852] leading-relaxed">
              {section.content.map((p, pIdx) => (
                <p key={pIdx}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Navigation Footer */}
      <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#5C5852] border-t border-[#E5E3DD]">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1.5 text-[#4A5D4E] font-semibold hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Homepage
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/legal/privacy`} className="hover:text-[#121212] transition">Privacy Policy</Link>
          <Link href={`/${locale}/legal/terms`} className="hover:text-[#121212] transition">Terms</Link>
          <Link href={`/${locale}/legal/shipping`} className="hover:text-[#121212] transition">Shipping</Link>
          <Link href={`/${locale}/legal/imprint`} className="hover:text-[#121212] transition">Imprint</Link>
        </div>
      </div>
    </div>
  );
}
