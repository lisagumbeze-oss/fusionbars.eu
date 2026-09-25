import { NextRequest, NextResponse } from 'next/server';
import { resolveCurrencyPriceAction } from '@/actions/currency';
import { currencySchema } from '@/validation/schemas';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCurrency = searchParams.get('currency') || 'EUR';
  const priceEUR = parseInt(searchParams.get('priceEUR') || '0', 10);
  const rawPriceGBP = searchParams.get('priceGBP');
  const priceGBP = rawPriceGBP ? parseInt(rawPriceGBP, 10) : null;

  try {
    const targetCurrency = currencySchema.parse(rawCurrency);
    const result = await resolveCurrencyPriceAction({
      targetCurrency,
      priceEUR,
      priceGBP,
    });
    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
