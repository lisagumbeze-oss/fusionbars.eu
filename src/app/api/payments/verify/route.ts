import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentStatusAction } from '@/actions/payments';
import { orderStatusTransitionSchema } from '@/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = orderStatusTransitionSchema.parse(body);

    const result = await verifyPaymentStatusAction({
      orderId: validated.orderId,
      targetStatus: validated.newStatus as any,
      actorRole: validated.actorRole,
      actorId: validated.actorId,
      notes: validated.note,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.errors ? error.errors.map((e: any) => e.message).join(', ') : error.message },
      { status: 400 }
    );
  }
}
