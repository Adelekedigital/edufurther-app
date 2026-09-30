import { NextResponse } from 'next/server';
import {
  DEFAULT_WINDOW_DAYS,
  MAX_WINDOW_DAYS,
  prefs,
  problem,
  windowOk,
} from '@/lib/api/mock/bookingPrefs';
import { MOCK_COUNTRIES, setMockItems } from '@/lib/api/mock/catalog';
import { OFFERINGS } from '@/lib/api/mock/fixtures';

/**
 * MOCK of GET /api/v1/users/{id}/mentor-profile — only what Session Types reads:
 * the booking defaults a type inherits (backend #13, #16, round 3 B).
 * ENABLE_MOCK_API=1 only.
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
    ...prefs,
    max_booking_window_days: MAX_WINDOW_DAYS,
    default_booking_window_days: DEFAULT_WINDOW_DAYS,
    primary_study_program: null,
    primary_study_country: null,
    offerings: [],
  });
}

const ALLOWED: Record<string, (v: unknown) => boolean> = {
  default_duration_minutes: (v) => v === null || [30, 45, 60, 90].includes(v as number),
  // Backend round 3: under 24 hours is refused.
  default_min_notice_minutes: (v) => v === null || [1440, 2880, 4320].includes(v as number),
  // 4 to the platform cap, or the default already stored (backend #309).
  booking_window_days: (v) => windowOk(v, prefs.booking_window_days),
  break_after_minutes: (v) => v === null || (typeof v === 'number' && v >= 0 && v <= 120),
  requires_booking_confirmation: (v) => typeof v === 'boolean',
  // The owner's headline (profile edit): null or blank clears it; 300 at most.
  headline: (v) => v === null || (typeof v === 'string' && v.trim().length <= 300),
};

/** The owner's topics and where they studied (profile editors); kept per user. */
const ITEMS: Record<string, (v: unknown) => boolean> = {
  offering_ids: (v) =>
    Array.isArray(v) &&
    new Set(v).size === v.length &&
    v.every((id) => OFFERINGS.some((o) => o.id === id)),
  primary_study_country_id: (v) => v === null || MOCK_COUNTRIES.some((c) => c.id === v),
};

/**
 * MOCK of PATCH /api/v1/users/{id}/mentor-profile: the booking preferences,
 * the headline, and the owner's topics and where they studied.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 400));
  for (const [k, v] of Object.entries(body)) {
    const ok = ALLOWED[k] ?? ITEMS[k];
    if (ok && !ok(v))
      return NextResponse.json(
        {
          ...problem(422, 'Validation failed'),
          errors: [{ pointer: `/${k}`, message: 'Invalid' }],
        },
        { status: 422, headers: { 'content-type': 'application/problem+json' } },
      );
  }
  for (const k of Object.keys(ALLOWED)) if (k in body) Object.assign(prefs, { [k]: body[k] });
  for (const k of Object.keys(ITEMS)) if (k in body) setMockItems(userId, { [k]: body[k] });
  return NextResponse.json({ updated: true });
}
