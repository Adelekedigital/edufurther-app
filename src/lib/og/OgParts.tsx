/* eslint-disable @next/next/no-img-element -- satori (next/og) draws plain <img> only; next/image can't render inside ImageResponse */
import type { ReactNode } from 'react';
import { coverInkHex, tokenHex } from '@/lib/utils/imageColors';
import type { CoverKey } from '@/lib/utils/cover';

/**
 * The link preview images' shared pieces (Invite Preview.dc.html): the
 * blue-50 page with the logo top left, the white-ringed face, and the centred
 * title and body. Colours are tokens via imageColors: satori reads no CSS
 * variables.
 */

/** satori lays a fragment's children out in a row: each version is its own column. */
export const OG_STACK = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 28,
} as const;

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
        background: tokenHex('blue-50'),
        color: tokenHex('ink-900'),
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
        width: 224,
        height: 224,
        borderRadius: 9999,
        boxShadow: `0 0 0 10px ${tokenHex('white')}`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: coverInkHex(cover),
        color: tokenHex('white'),
        fontSize: 80,
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      {photo ? (
        <img src={photo} alt="" width={224} height={224} style={{ objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  );
}

/** A fallback preview: the swoosh mark (128×55 source, 64px tall) over the generic lines. */
export function OgFallback({ mark, title, body }: { mark: string; title: string; body: string }) {
  return (
    <div style={{ ...OG_STACK, gap: 16 }}>
      <img src={mark} alt="" height={64} width={149} />
      <OgLines title={title} body={body} gap={16} />
    </div>
  );
}

export function OgLines({ title, body, gap = 12 }: { title: string; body: string; gap?: number }) {
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
