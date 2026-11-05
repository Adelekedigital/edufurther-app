import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/invites/{code}: who an invite is from, before sign-in.
 * The InviteModal's sample link (`damilola-7k2x`) names Damilola, and
 * `sade-5k2p` names Ṣadé (letters DM Sans lacks: the preview's font fallback);
 * every other
 * code answers `inviter: null`, as the backend does for any code that can't be
 * joined through (never an error). ENABLE_MOCK_API=1 only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { code } = await ctx.params;
  await new Promise((r) => setTimeout(r, 140));
  const name = ({ 'damilola-7k2x': 'Damilola', 'sade-5k2p': 'Ṣadé' } as Record<string, string>)[
    code.toLowerCase()
  ];
  const inviter = name ? { first_name: name, avatar_url: null } : null;
  return ok('/api/v1/invites/{code}', 'get', { inviter });
}
