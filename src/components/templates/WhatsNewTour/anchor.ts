import type { TargetPlace } from '@/lib/utils/whatsNew';

/**
 * Where the tour's step card sits, and its spotlight (ADR 0014). The tour
 * finds what it points at by `data-tour` id (AppShell nav items, CreditsPill),
 * never by position.
 */

/** The shown element with this `data-tour` id: the rail and the phone tabs both exist, one hidden. */
export function findTarget(id: string): HTMLElement | null {
  // Ids are our own constants (TourTarget), never user input.
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  return [...all].find((el) => el.getClientRects().length > 0) ?? null;
}

/** Shown now, held in the phone's More sheet (which the step opens), or absent. */
export function placeOf(id: string): TargetPlace {
  if (findTarget(id)) return 'shown';
  const holds = findTarget('nav-more')?.dataset.tourHolds?.split(' ') ?? [];
  return holds.includes(id) ? 'more' : null;
}

export type Box = { top: number; left: number; width: number; height: number };

export type Anchor = {
  /** The spotlight around the target, null while it isn't on screen yet. */
  hole: Box | null;
  /** The card's fixed position. */
  card: { top?: number; left?: number; right?: number; bottom?: number; width?: number };
  /** Desktop only: the pointer's side, and its offset along that side (px). */
  pointer: { side: 'left' | 'top'; at: number } | null;
};

/** The space around the target the spotlight takes. */
export const HOLE_PAD = 4;
const GAP = 12;
const EDGE = 16;
/** Desktop card width (phones: the screen less its gutters). */
export const CARD_W = 340;

export type Frame = {
  viewport: { w: number; h: number };
  /** The card's own size, once measured. */
  card: { w: number; h: number };
  /** Bottom of the phone header, top of the phone tab bar (null: none on screen). */
  headerBottom: number;
  tabsTop: number | null;
  phone: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

function onScreen(t: Box, w: number, h: number): Box {
  const left = Math.max(0, t.left - HOLE_PAD);
  const top = Math.max(0, t.top - HOLE_PAD);
  const right = Math.min(w, t.left + t.width + HOLE_PAD);
  const bottom = Math.min(h, t.top + t.height + HOLE_PAD);
  return { top, left, width: right - left, height: bottom - top };
}

/**
 * Phones: above the tab bar for a tab, otherwise under the header (a header
 * target, or an item in the open More sheet, which a bottom card would cover).
 * Desktop: beside a rail item, pointing at it; under anything else (the
 * credits pill), pointing up. With no target yet, centred.
 */
export function anchorFor(t: Box | null, f: Frame): Anchor {
  const { w, h } = f.viewport;
  // Padded, but kept on screen (a tab at the edge would lose its ring).
  const hole = t ? onScreen(t, w, h) : null;
  if (f.phone) {
    const inTabs = !!t && f.tabsTop !== null && t.top >= f.tabsTop - 1;
    if (!t || inTabs)
      return {
        hole,
        card: { left: EDGE, right: EDGE, bottom: (f.tabsTop === null ? h : h - f.tabsTop) + GAP },
        pointer: null,
      };
    return { hole, card: { left: EDGE, right: EDGE, top: f.headerBottom + GAP }, pointer: null };
  }
  const width = Math.min(CARD_W, w - EDGE * 2);
  if (!t)
    return {
      hole,
      card: { width, left: (w - width) / 2, top: Math.max(EDGE, (h - f.card.h) / 2) },
      pointer: null,
    };
  if (t.left + t.width < w / 3) {
    const mid = t.top + t.height / 2;
    const top = clamp(mid - f.card.h / 2, EDGE, h - f.card.h - EDGE);
    return {
      hole,
      card: { width, left: t.left + t.width + HOLE_PAD + GAP, top },
      pointer: { side: 'left', at: clamp(mid - top, GAP * 2, f.card.h - GAP * 2) },
    };
  }
  const right = Math.max(EDGE, w - (t.left + t.width));
  const cardLeft = w - right - width;
  return {
    hole,
    card: { width, right, top: t.top + t.height + HOLE_PAD + GAP },
    pointer: { side: 'top', at: clamp(t.left + t.width / 2 - cardLeft, GAP * 2, width - GAP * 2) },
  };
}

/** The page's frame now: the viewport, the phone chrome, the card's size. */
export function frameNow(card: HTMLElement | null, phone: boolean): Frame {
  const header = document.querySelector<HTMLElement>('[data-shell-header]');
  const tabs = [...document.querySelectorAll<HTMLElement>('[data-phone-tabs]')].find(
    (el) => el.getClientRects().length > 0,
  );
  const r = card?.getBoundingClientRect();
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    card: { w: r?.width ?? CARD_W, h: r?.height ?? 0 },
    headerBottom: header?.getBoundingClientRect().bottom ?? 0,
    tabsTop: tabs ? tabs.getBoundingClientRect().top : null,
    phone,
  };
}

export function boxOf(el: HTMLElement | null): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}
