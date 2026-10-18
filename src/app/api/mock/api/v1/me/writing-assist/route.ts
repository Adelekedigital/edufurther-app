import { NextResponse } from 'next/server';
import { ok, problem } from '@/lib/api/mock/respond';

// Both write about_me: 1,500 (owner, 2026-10-17).
const MAX = { mentor_about: 1500, mentee_bio: 1500 } as const;
let used = { day: '', n: 0 };

/**
 * MOCK of POST /api/v1/me/writing-assist (backend #7, PRD B7). Never saves.
 * Draft writes from "the profile"; improve tidies the text it's sent. The
 * 11th call answers 429 (the daily limit). ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    field?: string;
    mode?: string;
    text?: string;
  } | null;
  const field = body?.field as keyof typeof MAX | undefined;
  if (!field || !(field in MAX) || (body?.mode !== 'draft' && body?.mode !== 'improve'))
    return problem(422, { title: 'Validation failed' });
  const day = new Date().toISOString().slice(0, 10);
  if (used.day !== day) used = { day, n: 0 };
  if (++used.n > 10)
    return problem(429, { type: '/problems/writing-assist-limit', title: 'Too many requests' });
  await new Promise((r) => setTimeout(r, 900));
  const text =
    body.mode === 'draft'
      ? 'I moved from Nigeria to a fully funded PhD in Sociology at Mississippi State. I help with statements of purpose, school selection and scholarships.'
      : (body.text ?? '')
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase())
          .replace(/([^.!?])$/, '$1.');
  return ok('/api/v1/me/writing-assist', 'post', {
    text: text.slice(0, MAX[field]),
    // Named like the backend's bio prompts (a version it doesn't know is a 422 on save).
    prompt_version: body.mode === 'draft' ? 'bio_draft-v1' : 'bio_improve-v1',
  });
}
