import { NextResponse } from 'next/server';

/**
 * MOCK of GET /api/v1/sessions/{id}/events — the lifecycle, whose last event
 * carries the written reason the details panel shows. Keyed off the mock
 * session ids so each past outcome can be seen. ENABLE_MOCK_API=1 only.
 */
// `actor` is relative to the viewer, so the panel's "you / them / nobody"
// reads correctly whichever side of the session the viewer is on.
const OUTCOME: Record<string, { to: string; actor: 'them' | 'you' | 'system'; text: string | null }> =
  {
    'h-3': { to: 'cancelled', actor: 'them', text: 'Sorry — my visa interview was moved to the same hour.' },
    'h-4': { to: 'no_show', actor: 'system', text: null },
    'h-5': { to: 'declined', actor: 'them', text: 'I’m away that week. Try the 14th and I’ll confirm.' },
    'h-6': { to: 'expired', actor: 'system', text: null },
    // Withdrawn with nothing written: the panel shows the heading and no quote.
    'h-7': { to: 'withdrawn', actor: 'you', text: null },
  };

export async function GET(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 120));
  const at = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const events: unknown[] = [
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
      actor_id: end.actor === 'system' ? null : end.actor === 'you' ? 'mock-viewer' : `mock-${sessionId}`,
      actor_type: end.actor === 'system' ? 'system' : 'user',
      reason_code: null,
      reason_text: end.text,
      created_at: at(-20),
    });
  return NextResponse.json({ data: events, next_cursor: null });
}
