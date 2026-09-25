'use client';

import React from 'react';
import { useCommerce } from '../context/CommerceContext';
import { SUPPORTED_LOCALES, getDictionary } from '../i18n';
import { LocaleCode, CurrencyCode } from '../types';
import { Globe, Truck } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function AnnouncementBar() {
  const { currency, setCurrency, locale } = useCommerce();
  const dict = getDictionary(locale);
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: LocaleCode) => {
    // Replace the locale in current pathname
    const segments = pathname.split('/');
    if (segments.length > 1 && SUPPORTED_LOCALES.includes(segments[1] as any)) {
      segments[1] = newLocale;
      router.push(segments.join('/') || `/${newLocale}`);
    } else {
      router.push(`/${newLocale}`);
    }
  };

  return (
    <aside aria-label="Store announcement and preferences" className="bg-[#121212] text-[#FBFBF9] text-[11px] border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 tracking-wide font-normal text-neutral-300 text-center sm:text-left">
          <Truck className="w-3.5 h-3.5 text-[#88A48D] shrink-0 hidden sm:inline" />
          <span>
            {locale === 'de'
              ? 'Kostenloser Europa-Versand ab 300 € · Diskrete neutrale Verpackung aus NL, ES, DE, FR'
              : locale === 'fr'
              ? 'Livraison européenne offerte dès 300 € · Expédition discrète depuis NL, ES, DE, FR'
              : locale === 'es'
              ? 'Envío europeo gratuito a partir de 300 € · Empaque discreto desde NL, ES, DE, FR'
              : locale === 'it'
              ? 'Spedizione europea gratuita oltre 300 € · Imballaggio discreto da NL, ES, DE, FR'
              : locale === 'nl'
              ? 'Gratis Europese verzending vanaf €300 · Discrete verpakking vanuit NL, ES, DE, FR'
              : 'Free European Courier on orders over €300 · 100% Plain Discreet Packaging from NL, ES, DE, FR'}
          </span>
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
