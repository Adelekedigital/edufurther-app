/* eslint-disable @next/next/no-img-element -- satori (next/og) draws plain <img> only; next/image can't render inside ImageResponse */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { headers } from 'next/headers';
import { ImageResponse } from 'next/og';
import { lookupInviterOnServer } from '@/lib/api/data/inviteServer';
import { INVITE_LANDING_COPY } from '@/lib/copy/invite';
import { coverInkHex, tokenHex } from '@/lib/utils/imageColors';
import { personCover } from '@/lib/utils/person';
import { requestOrigin } from './requestOrigin';

const COPY = INVITE_LANDING_COPY.preview;

export const alt = COPY.alt;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** satori lays a fragment's children out in a row: each version is its own column. */
const STACK = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 28,
} as const;

/** A photo the crawler can't get in this time is drawn as the initial. */
const PHOTO_TIMEOUT_MS = 2500;

const dataUrl = (bytes: Buffer, type: string) => `data:${type};base64,${bytes.toString('base64')}`;

/**
 * The photo as a data URL, or null: satori fails the whole image on a photo it
 * can't load, so it is fetched here first. Only our image host reaches here
 * (`inviterPhoto`).
 */
async function photoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/^image\/(png|jpeg|webp|gif)/.test(type)) return null;
    return dataUrl(Buffer.from(await res.arrayBuffer()), type.split(';')[0]!);
  } catch {
    return null;
  }
}

/**
 * The invite link's preview (Invite Preview.dc.html, PRD Invite Landing PR 5):
 * 1200×630 on blue-50, the logo top left, the inviter's photo or initial in a
 * white-ringed circle, "{First} invited you" and the perk. A code that can't
 * be joined (or any failure) draws the fallback: the swoosh mark and the
 * generic lines. Colours are tokens (imageColors), the type DM Sans (static
 * cuts, scripts/fonts/og_fonts.py).
 */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = requestOrigin(await headers());
  const [inviter, regular, bold, logo, mark] = await Promise.all([
    lookupInviterOnServer(code, origin),
    // Literal paths: a computed one makes the build trace the whole project.
    readFile(join(process.cwd(), 'src/app/fonts/og/dm-sans-regular.ttf')),
    readFile(join(process.cwd(), 'src/app/fonts/og/dm-sans-bold.ttf')),
    readFile(join(process.cwd(), 'public/brand/edufurther-logo-full.png')),
    readFile(join(process.cwd(), 'public/brand/edufurther-mark-swoosh.png')),
  ]);
  const photo = await photoData(inviter?.photoUrl ?? null);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokenHex('blue-50'),
        color: tokenHex('ink-900'),
        fontFamily: 'DM Sans',
      }}
    >
      {/* 4096×547 source, 32px tall. */}
      <img
        src={dataUrl(logo, 'image/png')}
        alt=""
        height={32}
        width={240}
        style={{ position: 'absolute', left: 48, top: 44 }}
      />
      {inviter ? (
        <div style={STACK}>
          <div
            style={{
              width: 224,
              height: 224,
              borderRadius: 9999,
              boxShadow: `0 0 0 10px ${tokenHex('white')}`,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: coverInkHex(personCover(code)),
              color: tokenHex('white'),
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {photo ? (
              <img src={photo} alt="" width={224} height={224} style={{ objectFit: 'cover' }} />
            ) : (
              inviter.firstName.charAt(0).toUpperCase()
            )}
          </div>
          <Lines title={COPY.title(inviter.firstName)} body={COPY.body} />
        </div>
      ) : (
        <div style={{ ...STACK, gap: 16 }}>
          {/* 128×55 source, 64px tall. */}
          <img src={dataUrl(mark, 'image/png')} alt="" height={64} width={149} />
          <Lines title={COPY.fallbackTitle} body={COPY.fallbackBody} gap={16} />
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: [
        { name: 'DM Sans', data: regular, weight: 400, style: 'normal' },
        { name: 'DM Sans', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );
}

function Lines({ title, body, gap = 12 }: { title: string; body: string; gap?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap,
        maxWidth: 840,
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 60, lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.02em' }}>
        {title}
      </span>
      <span style={{ fontSize: 32, lineHeight: 1.4, fontWeight: 400, color: tokenHex('ink-700') }}>
        {body}
      </span>
    </div>
  );
}
