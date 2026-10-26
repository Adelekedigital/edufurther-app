import type { Metadata } from 'next';
import { InviteArrival } from '../../_auth/InviteArrival';

export const metadata: Metadata = { title: 'You’re invited', robots: { index: false } };

/**
 * The invite link's landing (`${origin}/invite/${code}`, InviteModal). The
 * code is only checked and remembered on the client (sessionStorage); it is
 * never rendered.
 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <InviteArrival code={code} />;
}
