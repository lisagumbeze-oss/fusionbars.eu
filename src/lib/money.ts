// ===================================================
// FUSION MUSHROOM BARS EU - MONEY ARITHMETIC ENGINE
// Guaranteed Integer Precision (Minor Units Only)
// No Floating-Point Currency Drift
// ===================================================

import { CurrencyCode, LocaleCode, MinorUnits } from '@/types';

export class MoneyEngine {
  /**
   * Safely adds two integer minor unit values.
   */
  static add(a: MinorUnits, b: MinorUnits): MinorUnits {
    this.assertInteger(a, 'First operand');
    this.assertInteger(b, 'Second operand');
    return a + b;
  }

  /**
   * Safely subtracts minor units, clamping at zero to prevent negative totals.
   */
  static subtract(minuend: MinorUnits, subtrahend: MinorUnits): MinorUnits {
    this.assertInteger(minuend, 'Minuend');
    this.assertInteger(subtrahend, 'Subtrahend');
    return Math.max(0, minuend - subtrahend);
  }

  /**
   * Multiplies an integer minor unit by an integer quantity.
   */
  static multiply(unitAmount: MinorUnits, quantity: number): MinorUnits {
    this.assertInteger(unitAmount, 'Unit amount');
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`Quantity must be a non-negative integer, received: ${quantity}`);
    }
    return unitAmount * quantity;
  }

  /**
   * Calculates a percentage discount (1 - 100), rounding to nearest cent.
   */
  static applyPercentageDiscount(amount: MinorUnits, percentage: number): MinorUnits {
    this.assertInteger(amount, 'Amount');
    if (percentage < 0 || percentage > 100) {
      throw new Error(`Discount percentage must be between 0 and 100, received: ${percentage}`);
    }
    return Math.round((amount * percentage) / 100);
  }

  /**
   * Formats minor units into an authoritative currency string based on European standards.
   * e.g. 2000 EUR -> "20,00 €" (in de/fr/es/it/nl) or "€20.00" (in en)
   *      1750 GBP -> "£17.50"
   */
  static format(amount: MinorUnits, currency: CurrencyCode = 'EUR', locale: LocaleCode = 'en'): string {
    this.assertInteger(amount, 'Amount');
    const majorUnits = amount / 100;

    const localeMap: Record<LocaleCode, string> = {
      en: 'en-IE', // European English with standard Euro presentation
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES',
      it: 'it-IT',
      nl: 'nl-NL',
    };

    const targetLocale = currency === 'GBP' ? 'en-GB' : localeMap[locale] || 'en-IE';

    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(majorUnits);
  }

  /**
   * Converts major units (e.g., 20.50) to minor units (2050) with safe rounding.
   */
  static fromMajorUnits(amount: number): MinorUnits {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error(`Invalid major unit amount: ${amount}`);
    }
    return Math.round(amount * 100);
  }

  /**
   * Converts minor units (2050) to major units (20.5).
   */
  static toMajorUnits(amount: MinorUnits): number {
    this.assertInteger(amount, 'Amount');
    return amount / 100;
  }

  private static assertInteger(val: unknown, label: string): asserts val is number {
    if (typeof val !== 'number' || !Number.isInteger(val) || isNaN(val)) {
      throw new Error(`${label} must be a valid integer minor unit, received: ${val}`);
    }
  }
}
