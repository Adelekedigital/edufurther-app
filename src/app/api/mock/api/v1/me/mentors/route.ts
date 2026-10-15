import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/me/mentors — the mentee's met mentors for the home
 * "Book again" list. Four sample mentors, one of each bookability (open /
 * has_upcoming / pending / unavailable) and one with a null slug (not public,
 * so the card doesn't link), most recent session first. ENABLE_MOCK_API=1 only.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 140));
  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return ok('/api/v1/me/mentors', 'get', {
    data: [
      {
        id: 'm-olajuwon',
        slug: 'olajuwon-samuel',
        first_name: 'Olajuwon',
        last_name: 'Samuel',
        avatar_url: null,
        avatar_focus: null,
        degree: 'MSc, Computer Science',
        institution: 'University of London',
        session_count: 3,
        last_session_at: iso(2),
        bookability: 'has_upcoming',
      },
      {
        id: 'm-mariam',
        slug: 'mariam-alamata',
        first_name: 'Mariam',
        last_name: 'Alamata',
        avatar_url: null,
        avatar_focus: null,
        degree: 'MSc, Public Health',
        institution: 'University of Edinburgh',
        session_count: 2,
        last_session_at: iso(9),
        bookability: 'open',
      },
      {
        id: 'm-adaeze',
        slug: 'adaeze-okonkwo',
        first_name: 'Adaeze',
        last_name: 'Okonkwo',
        avatar_url: null,
        avatar_focus: null,
        degree: 'MSc, Data Science',
        institution: 'University of Manchester',
        session_count: 1,
        last_session_at: iso(21),
        bookability: 'pending',
      },
      {
        id: 'm-nana',
        slug: null,
        first_name: 'Nana',
        last_name: 'Boateng',
        avatar_url: null,
        avatar_focus: null,
        degree: 'MSc, Environmental Policy',
        institution: 'University of Oxford',
        session_count: 1,
        last_session_at: iso(34),
        bookability: 'unavailable',
      },
    ],
    next_cursor: null,
  });
}
