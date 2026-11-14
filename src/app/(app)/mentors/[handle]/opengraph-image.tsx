import { ImageResponse } from 'next/og';
import { lookupMentorPreviewOnServer } from '@/lib/api/data/mentorPreview';
import { mockOrigin } from '@/lib/api/data/serverBackend';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import { MENTOR_FALLBACK_IMAGE, OG_SIZE, ogAssets, photoData } from '@/lib/og/ogAssets';
import { OG_STACK, OgFace, OgFrame, OgLines } from '@/lib/og/OgParts';
import { tokenHex } from '@/lib/utils/imageColors';
import { safeDecode } from '@/lib/utils/text';

const COPY = MENTOR_SHARE_COPY.preview;

export const alt = COPY.alt;
export const size = OG_SIZE;
export const contentType = 'image/png';
// Redrawn at most every 30 min per mentor, never per crawler hit (Vercel cost
// rules). A literal, as Next reads segment config statically:
// MENTOR_PREVIEW_REVALIDATE_S (previewMetadata.test pins the two together).
export const revalidate = 1800;
// No mentor is drawn at build; each is drawn on its first request and then
// cached (ISR). Without this the dynamic segment makes the route ƒ, per request.
export function generateStaticParams() {
  return [];
}

/** The help areas drawn as pills, at most this many (one row at 1200px). */
const PILLS = 3;

/**
 * A mentor profile link's preview (owner, 2026-11-13), in the invite
 * preview's frame: the photo or initials on their cover ink, the name, their
 * school and up to three help areas. A hidden, unapproved or missing profile
 * (or any failure) redirects to the one shared generic image, so random
 * handles never draw images of their own.
 */
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  const handle = safeDecode(raw) ?? raw;
  const mentor = await lookupMentorPreviewOnServer(handle, await mockOrigin());
  // A plain 307, not next/navigation's redirect(): that one is cached for a
  // year, so a profile approved later would keep the generic picture.
  if (!mentor)
    return new Response(null, { status: 307, headers: { location: MENTOR_FALLBACK_IMAGE } });
  const [assets, photo] = await Promise.all([ogAssets(), photoData(mentor.photoUrl)]);

  return new ImageResponse(
    <OgFrame logo={assets.logo} fontFamily={assets.fontFamily}>
      <div style={OG_STACK}>
        <OgFace photo={photo} initials={mentor.initials} cover={mentor.cover} />
        <OgLines title={mentor.name} body={mentor.school ?? COPY.alt} />
        {mentor.topics.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: 12 }}>
            {mentor.topics.slice(0, PILLS).map((t) => (
              <span
                key={t}
                style={{
                  padding: '8px 20px',
                  borderRadius: 9999,
                  background: tokenHex('white'),
                  color: tokenHex('blue-700'),
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </OgFrame>,
    { ...OG_SIZE, fonts: assets.fonts },
  );
}
