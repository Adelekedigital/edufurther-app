import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { lookupInviterOnServer } from '@/lib/api/data/inviteServer';
import { INVITE_LANDING_COPY } from '@/lib/copy/invite';
import { InviteLanding } from './_components/InviteLanding';
import { requestOrigin } from '@/lib/utils/requestOrigin';

const PREVIEW = INVITE_LANDING_COPY.preview;

/**
 * The tab title stays "You're invited"; og:title and og:description carry
 * the preview image's two lines (or the fallback's), so a chat app's card
 * reads like the picture. The image itself is opengraph-image.tsx. noindex.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const inviter = await lookupInviterOnServer(code, requestOrigin(await headers()));
  const title = inviter ? PREVIEW.title(inviter.firstName) : PREVIEW.fallbackTitle;
  const description = inviter ? PREVIEW.body : PREVIEW.fallbackBody;
  return {
    title: 'You’re invited',
    robots: { index: false },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/**
 * The invite link's landing (`${origin}/invite/${code}`, InviteModal; PRD
 * Invite Landing). The code is checked and remembered on the client
 * (localStorage, 30 days); it is never rendered.
 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <InviteLanding code={code} />;
}
