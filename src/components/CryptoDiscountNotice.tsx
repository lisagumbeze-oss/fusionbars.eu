import React from 'react';
import { Coins } from 'lucide-react';
import { LocaleCode } from '@/types';
import { getDictionary } from '@/i18n';
import { applyCryptoDiscountCopy } from '@/domain/payments/CryptoPaymentDiscount';

interface CryptoDiscountNoticeProps {
  locale: LocaleCode;
  compact?: boolean;
}

export default function CryptoDiscountNotice({ locale, compact = false }: CryptoDiscountNoticeProps) {
  const dict = getDictionary(locale);

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 text-[#121212] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <Coins className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-[#121212] ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {applyCryptoDiscountCopy(dict.payment.cryptoDiscountTitle)}
        </p>
        <p className={`text-[#5C5852] mt-0.5 leading-relaxed ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {applyCryptoDiscountCopy(dict.payment.cryptoDiscountBody)}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-[#121212] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {applyCryptoDiscountCopy(dict.payment.cryptoDiscountBadge)}
      </span>
    </div>
  );
}
