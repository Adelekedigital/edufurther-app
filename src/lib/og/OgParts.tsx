/* eslint-disable @next/next/no-img-element -- satori (next/og) draws plain <img> only; next/image can't render inside ImageResponse */
import type { ReactNode } from 'react';
import { coverInkHex, tokenHex } from '@/lib/utils/imageColors';
import type { CoverKey } from '@/lib/utils/cover';

/**
 * The link preview images' shared pieces (Invite Preview.dc.html, owner
 * 2026-11-14): the blue-900 card with the white wordmark top left, the
 * blue-700-ringed face, then an eyebrow, the title and the body, centred.
 * What matters stays in the centre 630×630, because WhatsApp and iMessage crop
 * to it. Colours are tokens via imageColors: satori reads no CSS variables.
 */

/** satori lays a fragment's children out in a row: each version is its own column. */
export const OG_STACK = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 24,
} as const;

/** Secondary lines on the card. */
const SOFT = tokenHex('blue-100');

export function OgFrame({
  logo,
  fontFamily,
  children,
}: {
  logo: string;
  fontFamily: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokenHex('blue-900'),
        color: tokenHex('white'),
        fontFamily,
      }}
    >
      {/* 630×84 source, 32px tall. */}
      <img
        src={logo}
        alt=""
        height={32}
        width={240}
        style={{ position: 'absolute', left: 48, top: 44 }}
      />
      {children}
    </div>
  );
}

/** A photo, else the initials on the person's cover ink. */
export function OgFace({
  photo,
  initials,
  cover,
}: {
  photo: string | null;
  initials: string;
  cover: CoverKey;
}) {
  return (
    <div
      style={{
        width: 248,
        height: 248,
        borderRadius: 9999,
        boxShadow: `0 0 0 8px ${tokenHex('blue-700')}`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: coverInkHex(cover),
        color: tokenHex('white'),
        fontSize: 88,
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      {photo ? (
        <img src={photo} alt="" width={248} height={248} style={{ objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  );
}

/**
 * The eyebrow says why the card exists and puts our domain on it: `lead` in
 * blue-200 ("Mentoring"), then `rest` ("on edufurther.org"), if any.
 */
export type OgEyebrow = { lead: string; rest?: string };

export function OgLines({
  eyebrow,
  title,
  body,
}: {
  eyebrow: OgEyebrow;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        maxWidth: 900,
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', gap: 8, fontSize: 26, lineHeight: 1.2, color: SOFT }}>
        <span style={{ color: tokenHex('blue-200'), fontWeight: 700 }}>{eyebrow.lead}</span>
        {eyebrow.rest && <span>{eyebrow.rest}</span>}
      </div>
      <span
        style={{
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          textWrap: 'balance',
        }}
      >
        {title}
      </span>
      {/* Balanced, so a long body never leaves one word on its last line. */}
      <span
        style={{ fontSize: 30, lineHeight: 1.3, fontWeight: 400, color: SOFT, textWrap: 'balance' }}
      >
        {body}
      </span>
    </div>
  );
}

/** A fallback preview: no face, the generic lines under the domain. */
export function OgFallback({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ ...OG_STACK, maxWidth: 840 }}>
      <OgLines eyebrow={OG_DOMAIN} title={title} body={body} />
    </div>
  );
}

/** The fallback's eyebrow: the domain alone. */
export const OG_DOMAIN: OgEyebrow = { lead: 'edufurther.org' };
