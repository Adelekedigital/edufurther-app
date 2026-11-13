import { ImageResponse } from 'next/og';
import { lookupMentorPreviewOnServer } from '@/lib/api/data/mentorPreview';
import { mockOrigin } from '@/lib/api/data/serverBackend';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import { OG_SIZE, ogAssets, photoData } from '@/lib/og/ogAssets';
import { OG_STACK, OgFace, OgFrame, OgLines, OgMark } from '@/lib/og/OgParts';
import { tokenHex } from '@/lib/utils/imageColors';
import { safeDecode } from '@/lib/utils/text';

const COPY = MENTOR_SHARE_COPY.preview;

export const alt = COPY.alt;
export const size = OG_SIZE;
export const contentType = 'image/png';
// Drawn once an hour per mentor, not per crawler hit (Vercel cost rules). A
// literal, as Next reads segment config statically: MENTOR_PREVIEW_REVALIDATE_S
// (mentorPreview.test pins the two together).
export const revalidate = 3600;

/** The help areas drawn as pills, at most this many (one row at 1200px). */
const PILLS = 3;

/**
 * A mentor profile link's preview (owner, 2026-11-13), in the invite
 * preview's frame: the photo or initials on their cover ink, the name, their
 * school and up to three help areas. A hidden, unapproved or missing profile
 * (or any failure) draws the generic one: the swoosh and the fallback lines.
 */
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  const handle = safeDecode(raw) ?? raw;
  const [mentor, assets] = await Promise.all([
    lookupMentorPreviewOnServer(handle, await mockOrigin()),
    ogAssets(),
  ]);
  const photo = await photoData(mentor?.photoUrl ?? null);

  return new ImageResponse(
    <OgFrame logo={assets.logo} fontFamily={assets.fontFamily}>
      {mentor ? (
        <div style={OG_STACK}>
          <OgFace photo={photo} initials={mentor.initials} cover={mentor.cover} />
          <OgLines title={mentor.name} body={mentor.school ?? COPY.alt} />
          {mentor.topics.length > 0 && (
            <div style={{ display: 'flex', gap: 12 }}>
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
      ) : (
        <div style={{ ...OG_STACK, gap: 16 }}>
          <OgMark mark={assets.mark} />
          <OgLines title={COPY.fallbackTitle} body={COPY.fallbackBody} gap={16} />
        </div>
      )}
    </OgFrame>,
    { ...OG_SIZE, fonts: assets.fonts },
  );
}
