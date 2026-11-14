import { headers } from 'next/headers';
import { ImageResponse } from 'next/og';
import { lookupInviterOnServer } from '@/lib/api/data/inviteServer';
import { INVITE_LANDING_COPY } from '@/lib/copy/invite';
import { OG_SIZE, ogAssets, photoData } from '@/lib/og/ogAssets';
import { OG_STACK, OgFace, OgFallback, OgFrame, OgLines } from '@/lib/og/OgParts';
import { personCover } from '@/lib/utils/person';
import { requestOrigin } from '@/lib/utils/requestOrigin';

const COPY = INVITE_LANDING_COPY.preview;

export const alt = COPY.alt;
export const size = OG_SIZE;
export const contentType = 'image/png';

/**
 * The invite link's preview (Invite Preview.dc.html, PRD Invite Landing PR 5):
 * 1200×630 on blue-50, the logo top left, the inviter's photo or initial in a
 * white-ringed circle, "{First} invited you" and the perk. A code that can't
 * be joined (or any failure) draws the fallback: the swoosh mark and the
 * generic lines.
 */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = requestOrigin(await headers());
  const [inviter, assets] = await Promise.all([lookupInviterOnServer(code, origin), ogAssets()]);
  const photo = await photoData(inviter?.photoUrl ?? null);

  return new ImageResponse(
    <OgFrame logo={assets.logo} fontFamily={assets.fontFamily}>
      {inviter ? (
        <div style={OG_STACK}>
          <OgFace
            photo={photo}
            initials={inviter.firstName.charAt(0).toUpperCase()}
            cover={personCover(code)}
          />
          <OgLines title={COPY.title(inviter.firstName)} body={COPY.body} />
        </div>
      ) : (
        <OgFallback mark={assets.mark} title={COPY.fallbackTitle} body={COPY.fallbackBody} />
      )}
    </OgFrame>,
    { ...OG_SIZE, fonts: assets.fonts },
  );
}
