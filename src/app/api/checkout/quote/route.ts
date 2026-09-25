import { NextRequest, NextResponse } from 'next/server';
import { cartCalculationRequestSchema } from '@/validation/schemas';
import { generateCheckoutQuoteAction } from '@/actions/checkout';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = cartCalculationRequestSchema.parse(body);

    const result = await generateCheckoutQuoteAction({
      items: validated.items,
      currency: validated.currency,
      destinationCountry: validated.destinationCountry,
      shippingMethod: validated.selectedShippingMethod || 'STANDARD',
      couponCode: validated.couponCode,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.errors ? error.errors.map((e: any) => e.message).join(', ') : error.message },
      { status: 400 }
    );
  }
}
