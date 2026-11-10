import { NextResponse } from 'next/server';
import { okStatus } from '@/lib/api/mock/respond';

type Recorded = {
  source: 'invite' | 'campaign' | 'referral_site' | 'direct';
  channel: Channel | null;
};
type Channel = 'linkedin' | 'google' | 'whatsapp' | 'instagram' | 'newsletter' | 'other';

const SOURCES = new Set(['invite', 'campaign', 'referral_site', 'direct']);
const CHANNELS = new Set(['linkedin', 'google', 'whatsapp', 'instagram', 'newsletter']);

/** The mock account's one record: write-once, as the backend keeps it. */
let recorded: Recorded | null = null;

/**
 * MOCK of POST /api/v1/me/acquisition (PRD 30): the first call records and
 * answers 201 with the record; every later one answers a bare 200 and changes
 * nothing. Values are never refused: an unknown source is `direct`, an
 * unknown channel `other`, and any referral code counts as a live invite.
 * ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 120));
  if (recorded) return new NextResponse(null, { status: 200 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const source =
    typeof body?.source === 'string' && SOURCES.has(body.source) ? body.source : 'direct';
  const channel = typeof body?.channel === 'string' ? body.channel : null;
  recorded = {
    source:
      typeof body?.referral_code === 'string' && body.referral_code
        ? 'invite'
        : (source as Recorded['source']),
    channel: channel === null ? null : CHANNELS.has(channel) ? (channel as Channel) : 'other',
  };
  return okStatus('/api/v1/me/acquisition', 'post', 201, recorded);
}
