import { NextResponse, type NextRequest } from 'next/server';
import { MENTORS } from '@/lib/api/mock/fixtures';
import { MOCK_SESSION_TYPES, mockSlots } from '@/lib/api/mock/availability';
import { uploads } from '@/lib/api/mock/intakeFiles';

const DAY = 24 * 60 * 60 * 1000;
const problem = (status: number, title: string, type = 'about:blank') =>
  NextResponse.json(
    { type, title, status },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );

/**
 * MOCK of POST /api/v1/sessions. Mirrors the contract's refusals: no
 * Idempotency-Key or an instant the grid doesn't offer → 422. The mock can't
 * know the mentor from the offering (every mock mentor shares the two
 * offerings), so it accepts an instant any mentor offers. ENABLE_MOCK_API=1 only.
 */
export async function POST(req: NextRequest) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  if (!req.headers.get('idempotency-key')) return problem(422, 'Idempotency-Key is required');
  const body = (await req.json().catch(() => null)) as {
    session_type_id?: string;
    starts_at?: string;
    answers?: { question_id?: string; text?: string; option_ids?: string[]; file_id?: string }[];
  } | null;
  const type = MOCK_SESSION_TYPES.find((t) => t.id === body?.session_type_id);
  if (!type || !body?.starts_at) return problem(422, 'Unprocessable Content');
  const now = Date.now();
  const offered = MENTORS.some((m) =>
    mockSlots(m.id, type.id, now + 56 * DAY, now).some(
      (s) => Date.parse(s.start) === Date.parse(body.starts_at!),
    ),
  );
  if (!offered) return problem(422, 'That instant is not offered');
  // Answers (backend #268, #282; REQUIRE_INTAKE_ANSWERS on): each must fit its
  // question; a required question needs one. 422 errors[] points at the answer.
  const answers = body.answers ?? [];
  const questions = type.questions ?? [];
  const errors: { pointer: string; message: string }[] = [];
  answers.forEach((a, i) => {
    const at = `/answers/${i}`;
    const qn = questions.find((x) => x.id === a.question_id);
    if (!qn) return errors.push({ pointer: `${at}/question_id`, message: 'not a question' });
    if (qn.question_type === 'free_text' && !a.text?.trim())
      errors.push({ pointer: at, message: 'this question takes `text`' });
    if (qn.question_type === 'file_upload') {
      const u = a.file_id ? uploads.get(a.file_id) : undefined;
      if (!a.file_id) errors.push({ pointer: at, message: 'this question takes `file_id`' });
      else if (!u || u.used)
        errors.push({
          pointer: `${at}/file_id`,
          message: 'not a file you uploaded, or already used',
        });
    }
    if (
      qn.question_type === 'multi_choice' &&
      (!a.option_ids?.length ||
        (!qn.allows_multiple && a.option_ids.length > 1) ||
        a.option_ids.some((o) => !qn.options.some((x) => x.id === o)))
    )
      errors.push({ pointer: `${at}/option_ids`, message: 'invalid options' });
  });
  for (const qn of questions)
    if (qn.is_required && !answers.some((a) => a.question_id === qn.id))
      errors.push({ pointer: '/answers', message: `question ${qn.id} is required` });
  if (errors.length)
    return NextResponse.json(
      { type: 'about:blank', title: 'Validation failed', status: 422, errors },
      { status: 422, headers: { 'content-type': 'application/problem+json' } },
    );
  for (const a of answers)
    if (a.file_id && uploads.has(a.file_id)) uploads.get(a.file_id)!.used = true;
  await new Promise((r) => setTimeout(r, 600));
  return NextResponse.json(
    {
      id: `bk-${now}`,
      session_type_id: type.id,
      status: 'pending',
      starts_at: body.starts_at,
      duration_minutes: type.duration_minutes,
    },
    { status: 201 },
  );
}
