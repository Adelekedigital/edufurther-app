import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of /api/v1/me/push-subscriptions (decision 312). Nothing is stored:
 * this browser is never subscribed in the mock, and adding or removing one
 * answers as the backend does. ENABLE_MOCK_API=1 only.
 */
const off = () => process.env.ENABLE_MOCK_API !== '1';

export async function GET() {
  if (off()) return new NextResponse(null, { status: 404 });
  return ok('/api/v1/me/push-subscriptions', 'get', { subscribed: false });
}

export async function POST() {
  if (off()) return new NextResponse(null, { status: 404 });
  return ok('/api/v1/me/push-subscriptions', 'post', { subscribed: true }, { status: 201 });
}

export async function DELETE() {
  if (off()) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
