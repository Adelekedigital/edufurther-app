import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import { mockViewerId } from '../route';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/sessions/{id}/events — the lifecycle, whose last event
 * carries the written reason the details panel shows. Keyed off the mock
 * session ids so each past outcome can be seen. ENABLE_MOCK_API=1 only.
 */
// `actor` is relative to the viewer, so the panel's "you / them / nobody"
// reads correctly whichever side of the session the viewer is on.
type Outcome = {
  to: components['schemas']['SessionStatus'];
  actor: 'them' | 'you' | 'system';
  text: string | null;
  /** What they picked. The panel reads this when nothing was written. */
  code?: components['schemas']['SessionReasonCode'] | null;
};
const OUTCOME: Record<string, Outcome> =
  {
    // Written *and* coded, which is the ordinary case now the chip is required:
    // the note wins and the code stays for reporting.
    'h-3': {
      to: 'cancelled',
      actor: 'them',
      code: 'scheduling_conflict',
      text: 'Sorry — my visa interview was moved to the same hour.',
    },
    // No code on purpose: nobody picked one. A no-show is the sweep noticing
    // an empty room, so the panel has only its heading to show.
    'h-4': { to: 'no_show', actor: 'system', text: null },
    'h-5': { to: 'declined', actor: 'them', code: 'mentor_unavailable', text: 'I’m away that week. Try the 14th and I’ll confirm.' },
    'h-6': { to: 'expired', actor: 'system', code: 'expired_no_response', text: null },
    // A chip and nothing typed — the common shape, since the box only appears
    // for "Something else". Without one of these in the mock, the sentence the
    // panel builds from the code cannot be seen in a drive or a page review.
    'h-7': { to: 'withdrawn', actor: 'you', code: 'mentee_no_longer_needed', text: null },
  };

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 120));
  const at = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const events: components['schemas']['SessionEventRead'][] = [
    {
      id: `${sessionId}-1`,
      from_status: null,
      to_status: 'pending_mentor_approval',
      actor_id: 'mock-mentee',
      actor_type: 'user',
      reason_code: null,
      reason_text: null,
      created_at: at(-40),
    },
  ];
  const end = OUTCOME[sessionId];
  if (end)
    events.push({
      id: `${sessionId}-2`,
      from_status: 'confirmed',
      to_status: end.to,
      actor_id:
        end.actor === 'system' ? null : end.actor === 'you' ? mockViewerId(req) : `mock-${sessionId}`,
      actor_type: end.actor === 'system' ? 'system' : 'user',
      reason_code: end.code ?? null,
      reason_text: end.text,
      created_at: at(-20),
    });
  return ok('/api/v1/sessions/{session_id}/events', 'get', { data: events, next_cursor: null });
}
