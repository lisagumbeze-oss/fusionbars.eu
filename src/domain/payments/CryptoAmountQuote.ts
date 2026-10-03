import { CurrencyCode } from '@/types';

/** Payment amounts are quoted to 8 decimal places, then locked for that order. */
export const CRYPTO_AMOUNT_DECIMALS = 8;

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BCH: 'bitcoin-cash',
};

export type CryptoFiatPrices = Record<string, number>;

type PriceLoader = (currency: CurrencyCode, symbols: string[]) => Promise<CryptoFiatPrices>;

let priceLoader: PriceLoader = fetchLiveCryptoPrices;

/** Test hook. Pass null to restore the live market-price loader. */
export function setCryptoPriceLoader(loader: PriceLoader | null): void {
  priceLoader = loader ?? fetchLiveCryptoPrices;
}

export function fiatMinorToCryptoAmount(amountMinor: number, priceMajor: number): string {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error('Order total must be a non-negative amount in minor units.');
  }
  if (!Number.isFinite(priceMajor) || priceMajor <= 0) {
    throw new Error('Cryptocurrency price must be a positive number.');
  }

  const priceScaled = BigInt(Math.round(priceMajor * 100_000_000));
  if (priceScaled <= 0n) {
    throw new Error('Cryptocurrency price must be a positive number.');
  }

  const numerator = BigInt(amountMinor) * 10n ** 16n;
  const denominator = priceScaled * 100n;
  const scaled = (numerator + denominator / 2n) / denominator;
  const whole = scaled / 100_000_000n;
  const fraction = (scaled % 100_000_000n).toString().padStart(CRYPTO_AMOUNT_DECIMALS, '0');
  return `${whole.toString()}.${fraction}`;
}

export function cryptoAmountToBaseUnits(amount: string, decimals: number): string {
  const [whole = '0', fraction = ''] = amount.split('.');
  const padded = fraction.padEnd(decimals, '0').slice(0, decimals);
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || '0')).toString();
}

export async function quoteCryptoAmounts(
  amountMinor: number,
  currency: CurrencyCode,
  symbols: string[]
): Promise<Record<string, string>> {
  const uniqueSymbols = [...new Set(symbols)];
  const prices = await priceLoader(currency, uniqueSymbols);
  const amounts: Record<string, string> = {};

  for (const symbol of uniqueSymbols) {
    const price = prices[symbol];
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new Error(`The exact ${symbol} amount could not be calculated. Please try again in a moment.`);
    }
    amounts[symbol] = fiatMinorToCryptoAmount(amountMinor, price);
  }

  return amounts;
}

const ALLOWED_PRICE_SYMBOLS = new Set(['BTC', 'ETH', 'BCH', 'USDT']);

async function fetchLiveCryptoPrices(currency: CurrencyCode, symbols: string[]): Promise<CryptoFiatPrices> {
  if ((currency !== 'EUR' && currency !== 'GBP') || symbols.some((symbol) => !ALLOWED_PRICE_SYMBOLS.has(symbol))) {
    throw new Error('Cryptocurrency price source is not an approved destination.');
  }
  try {
    return await fetchCoinGeckoPrices(currency, symbols);
  } catch {
    return fetchCoinbasePrices(currency, symbols);
  }
}

async function fetchCoinGeckoPrices(currency: CurrencyCode, symbols: string[]): Promise<CryptoFiatPrices> {
  const vs = currency.toLowerCase();
  const ids = symbols.map((symbol) => {
    const id = COINGECKO_IDS[symbol];
    if (!id) {
      throw new Error(`No market price is configured for ${symbol}.`);
    }
    return id;
  });
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=${vs}`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Cryptocurrency price request failed (${response.status}).`);
  }
  const body = await response.json();
  const prices: CryptoFiatPrices = {};
  for (const symbol of symbols) {
    const price = body?.[COINGECKO_IDS[symbol]]?.[vs];
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new Error(`Missing ${symbol} market price.`);
    }
    prices[symbol] = price;
  }
  return prices;
}

async function fetchCoinbasePrices(currency: CurrencyCode, symbols: string[]): Promise<CryptoFiatPrices> {
  const prices: CryptoFiatPrices = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      const url = `https://api.coinbase.com/v2/prices/${symbol}-${currency}/spot`;
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new Error(`Cryptocurrency price request failed (${response.status}).`);
      }
      const body = await response.json();
      const price = Number(body?.data?.amount);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Missing ${symbol} market price.`);
      }
      prices[symbol] = price;
    })
  );
  return prices;
}
