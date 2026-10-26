import { NextResponse } from 'next/server';
import { ok, problem } from '@/lib/api/mock/respond';
import { mockReminders } from '@/lib/api/mock/reminders';

/**
 * MOCK of POST /api/v1/sessions/{id}/reminder: the mentee's one reminder about
 * a pending request. A second send is the backend's 409; `p-1`, whose deadline
 * has passed, is its "not pending" 409. The real response is the session read;
 * the page refetches the lists instead of reading it, so the mock sends only
 * what changed. ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 400));
  if (sessionId === 'p-1')
    return problem(409, { type: '/problems/request-not-pending', title: 'Not pending' });
  if (mockReminders.get(sessionId))
    return problem(409, {
      type: '/problems/reminder-already-sent',
      title: 'A reminder was already sent for this request.',
    });
  const body = (await req.json()) as { message?: string };
  const message = body.message?.trim() ?? '';
  if (message.length < 1 || message.length > 500)
    return problem(422, { type: '/problems/validation', title: 'Invalid message' });
  mockReminders.add(sessionId);
  // Only what the page reads (it refetches the lists); not the whole session.
  return ok('/api/v1/sessions/{session_id}/reminder', 'post', {
    id: sessionId,
    reminder_sent_at: mockReminders.get(sessionId),
  } as never);
}
