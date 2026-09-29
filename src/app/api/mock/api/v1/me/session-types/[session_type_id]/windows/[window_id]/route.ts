import { NextResponse } from 'next/server';
import { mockRemoveWindow } from '@/lib/api/mock/sessionTypes';

/** MOCK of DELETE …/windows/{id} → {deleted: true}. ENABLE_MOCK_API=1 only. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ session_type_id: string; window_id: string }> },
) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id, window_id } = await ctx.params;
  await new Promise((r) => setTimeout(r, 150));
  return mockRemoveWindow(session_type_id, window_id)
    ? NextResponse.json({ deleted: true })
    : new NextResponse(null, { status: 404 });
}
