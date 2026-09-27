'use client';

import React from 'react';
import { useCommerce } from '../context/CommerceContext';
import { SUPPORTED_LOCALES } from '../i18n';
import { applyCryptoDiscountCopy } from '@/domain/payments/CryptoPaymentDiscount';
import { LocaleCode } from '../types';
import { Globe, Truck } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

const ANNOUNCEMENTS: Record<LocaleCode, string[]> = {
  en: [
    'Free European Courier on orders over €300',
    'Pay with cryptocurrency and save 10%',
    '100% Plain Discreet Packaging',
    'Dispatched from NL, ES, DE, FR',
  ],
  de: [
    'Kostenloser Europa-Versand ab 300 €',
    'Mit Kryptowährung zahlen und 10% sparen',
    'Diskrete neutrale Verpackung',
    'Versand aus NL, ES, DE, FR',
  ],
  fr: [
    'Livraison européenne offerte dès 300 €',
    'Payez en cryptomonnaie et économisez 10 %',
    'Expédition 100% discrète',
    'Expédié depuis NL, ES, DE, FR',
  ],
  es: [
    'Envío europeo gratuito a partir de 300 €',
    'Paga con criptomoneda y ahorra un 10%',
    'Empaque 100% discreto',
    'Enviado desde NL, ES, DE, FR',
  ],
  it: [
    'Spedizione europea gratuita oltre 300 €',
    'Paga in criptovaluta e risparmia il 10%',
    'Imballaggio 100% discreto',
    'Spedito da NL, ES, DE, FR',
  ],
  nl: [
    'Gratis Europese verzending vanaf €300',
    'Betaal met cryptocurrency en bespaar 10%',
    '100% discrete verpakking',
    'Verzonden vanuit NL, ES, DE, FR',
  ],
};

function TickerCopy({ messages }: { messages: string[] }) {
  return (
    <span className="flex items-center shrink-0">
      {messages.map((message) => (
        <span key={message} className="flex items-center shrink-0">
          <Truck className="w-3.5 h-3.5 text-[#88A48D] mx-3 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </span>
      ))}
    </span>
  );
}

export default function AnnouncementBar() {
  const { currency, setCurrency, locale } = useCommerce();
  const router = useRouter();
  const pathname = usePathname();
  const messages = (ANNOUNCEMENTS[locale] || ANNOUNCEMENTS.en).map((message) => applyCryptoDiscountCopy(message));

  const handleLocaleChange = (newLocale: LocaleCode) => {
    const segments = pathname.split('/');
    if (segments.length > 1 && SUPPORTED_LOCALES.includes(segments[1] as any)) {
      segments[1] = newLocale;
      router.push(segments.join('/') || `/${newLocale}`);
    } else {
      router.push(`/${newLocale}`);
    }
  };

  return (
    <aside
      aria-label="Store announcement and preferences"
      className="group/announce bg-[#121212] text-[#FBFBF9] text-[11px] border-b border-neutral-800"
    >
      <p className="sr-only">{messages.join('. ')}</p>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="w-full sm:flex-1 min-w-0 overflow-hidden">
          <div className="announce-marquee-track flex w-max items-center tracking-wide text-neutral-300 whitespace-nowrap">
            <TickerCopy messages={messages} />
            <span className="announce-marquee-duplicate flex" aria-hidden="true">
              <TickerCopy messages={messages} />
            </span>
          </div>
        </div>

        {/* Currency & Language Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center border border-neutral-800 rounded bg-neutral-900 overflow-hidden text-[10px] font-medium">
            <button
              onClick={() => setCurrency('EUR')}
              className={`px-2 py-0.5 transition ${currency === 'EUR' ? 'bg-[#4A5D4E] text-white font-semibold' : 'text-neutral-400 hover:text-white'}`}
              aria-label="Set currency to Euro"
            >
              € EUR
            </button>
            <button
              onClick={() => setCurrency('GBP')}
              className={`px-2 py-0.5 transition ${currency === 'GBP' ? 'bg-[#4A5D4E] text-white font-semibold' : 'text-neutral-400 hover:text-white'}`}
              aria-label="Set currency to British Pound"
            >
              £ GBP
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-neutral-300">
            <Globe className="w-3 h-3 text-neutral-400" />
            <select
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value as LocaleCode)}
              aria-label="Select store language"
              className="bg-transparent text-neutral-300 font-medium outline-none cursor-pointer hover:text-white"
            >
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l} value={l} className="bg-neutral-900 text-neutral-100">
                  {l === 'en' ? 'English (EN)' : l === 'de' ? 'Deutsch (DE)' : l === 'fr' ? 'Français (FR)' : l === 'es' ? 'Español (ES)' : l === 'it' ? 'Italiano (IT)' : 'Nederlands (NL)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
}
