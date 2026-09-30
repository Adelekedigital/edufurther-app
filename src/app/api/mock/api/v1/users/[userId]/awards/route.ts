import { NextResponse } from 'next/server';
import { awardProblem, mockAwards, setAwards } from '@/lib/api/mock/entries';

const invalid = (pointer: string) =>
  NextResponse.json(
    { title: 'Validation failed', status: 422, errors: [{ pointer }] },
    { status: 422 },
  );

/** MOCK of POST /api/v1/users/{id}/awards: adds one, newest first. ENABLE_MOCK_API=1 only. */
export async function POST(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return invalid('');
  const bad = awardProblem(body, false);
  if (bad) return invalid(bad);
  await new Promise((r) => setTimeout(r, 300));
  const award = {
    id: `aw-${Date.now()}`,
    title: String(body.title).trim(),
    institution: String(body.institution).trim(),
    year: (body.year as number | null | undefined) ?? null,
    funding: (body.funding as 'full' | 'partial' | null | undefined) ?? null,
  };
  setAwards(userId, [award, ...(mockAwards(userId) ?? [])]);
  return NextResponse.json({ ...award, verification_status: 'unverified' }, { status: 201 });
}
