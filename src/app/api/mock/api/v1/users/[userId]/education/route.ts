import { NextResponse } from 'next/server';
import {
  educationProblem,
  educationRead,
  mockEducation,
  setEducation,
  type MockEducation,
} from '@/lib/api/mock/entries';

const invalid = (pointer: string) =>
  NextResponse.json(
    { title: 'Validation failed', status: 422, errors: [{ pointer }] },
    { status: 422 },
  );

type Ctx = { params: Promise<{ userId: string }> };

/**
 * MOCK of GET /api/v1/users/{id}/education: the owner's degrees as saved
 * (seeded when their profile is first read). ENABLE_MOCK_API=1 only.
 */
export async function GET(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 200));
  return NextResponse.json({
    data: (mockEducation(userId) ?? []).map(educationRead),
    next_cursor: null,
  });
}

/** MOCK of POST /api/v1/users/{id}/education. */
export async function POST(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return invalid('');
  const bad = educationProblem(body, false);
  if (bad) return invalid(bad);
  if (body.date_start && body.date_end && String(body.date_end) < String(body.date_start))
    return invalid('/date_end');
  await new Promise((r) => setTimeout(r, 300));
  const entry: MockEducation = {
    id: `ed-${Date.now()}`,
    school_name_raw: String(body.school_name_raw).trim(),
    degree_abbreviation: (body.degree_abbreviation as string | null | undefined) ?? null,
    degree_level_id: (body.degree_level_id as string | null | undefined) ?? null,
    study_course: (body.study_course as string | null | undefined) ?? null,
    date_start: (body.date_start as string | null | undefined) ?? null,
    date_end: (body.date_end as string | null | undefined) ?? null,
    is_most_recent: body.is_most_recent === true,
  };
  setEducation(
    userId,
    [entry, ...(mockEducation(userId) ?? [])],
    entry.is_most_recent ? entry.id : undefined,
  );
  return NextResponse.json(educationRead(entry), { status: 201 });
}
