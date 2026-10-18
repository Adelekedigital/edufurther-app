import { NextResponse } from 'next/server';
import { submitApplication } from '@/lib/api/mock/mentorApplicationStore';
import { ok, problem } from '@/lib/api/mock/respond';

/** The outcome to force: `?mockSubmit=` on the page (read from the Referer), else MOCK_MENTOR_SUBMIT. */
function forced(req: Request): string | null {
  try {
    const q = new URL(req.headers.get('referer') ?? '').searchParams.get('mockSubmit');
    if (q) return q;
  } catch {
    // No page address: the env switch alone.
  }
  return process.env.MOCK_MENTOR_SUBMIT ?? null;
}

/**
 * MOCK of POST /api/v1/me/mentor-application/submit (PRD B2):
 * sets submitted_at once; a repeat is the same 200. Forced outcomes: `fail`
 * (500), `incomplete` (409, a photo missing), `decided` (409, already
 * reviewed) and `noprofile` (404). ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 600));
  switch (forced(req)) {
    case 'fail':
      return problem(500, { title: 'Internal Server Error' });
    case 'incomplete':
      return problem(409, {
        type: '/problems/mentor-application-incomplete',
        title: 'Mentor application incomplete',
        missing: ['avatar'],
      });
    case 'decided':
      return problem(409, {
        type: '/problems/mentor-application-decided',
        title: 'Mentor application already decided',
      });
    case 'noprofile':
      return problem(404, { title: 'Not Found' });
  }
  const r = submitApplication();
  if (r.status === 200) return ok('/api/v1/me/mentor-application/submit', 'post', r.body);
  if (r.status === 404) return problem(404, { title: 'Not Found' });
  return problem(409, {
    type: '/problems/mentor-application-decided',
    title: 'Mentor application already decided',
  });
}
