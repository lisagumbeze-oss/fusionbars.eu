import { NextRequest, NextResponse } from 'next/server';
import { submitPaymentProofAction } from '@/actions/payments';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await submitPaymentProofAction(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Payment proof processing error' }, { status: 500 });
  }
}
