import { NextResponse } from 'next/server';

/**
 * MOCK of POST /api/v1/mentors/{handle}/shares: always 204, as the backend
 * answers whether or not it stored a row (one per person, method and day).
 * ENABLE_MOCK_API=1 only.
 */
export async function POST() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
