import { NextRequest, NextResponse } from 'next/server';
import { createOrderAction } from '@/actions/orders';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createOrderAction(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error processing order' },
      { status: 500 }
    );
  }
}
