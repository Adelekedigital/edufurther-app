import type { Metadata } from 'next';
import { InviteLanding } from './_components/InviteLanding';

export const metadata: Metadata = { title: 'You’re invited', robots: { index: false } };

/**
 * The invite link's landing (`${origin}/invite/${code}`, InviteModal; PRD
 * Invite Landing). The code is checked and remembered on the client
 * (localStorage, 30 days); it is never rendered.
 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <InviteLanding code={code} />;
}
