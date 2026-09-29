import { NextResponse } from 'next/server';

/**
 * MOCK of GET /api/v1/users/{id}/mentor-profile — only what Session Types reads:
 * the booking defaults a type inherits (backend #13, #16). The design's sample
 * defaults: 4 weeks ahead, 15 min break, approve each request. ENABLE_MOCK_API=1 only.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  return NextResponse.json({
    id: '00000000-0000-4000-8000-000000000001',
    headline: null,
    years_of_experience: null,
    approval_status: 'approved',
    listing_status: 'listed',
    requires_booking_confirmation: true,
    booking_window_days: 28,
    break_after_minutes: 15,
    primary_study_program: null,
    primary_study_country: null,
    offerings: [],
  });
}
