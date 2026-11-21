import { anchorFor, CARD_W, HOLE_PAD, type Frame } from './anchor';

const phone: Frame = {
  viewport: { w: 390, h: 800 },
  card: { w: 358, h: 180 },
  headerBottom: 64,
  tabsTop: 744,
  phone: true,
};
const desktop: Frame = {
  viewport: { w: 1280, h: 860 },
  card: { w: CARD_W, h: 200 },
  headerBottom: 0,
  tabsTop: null,
  phone: false,
};

describe('anchorFor', () => {
  it('phones: a tab’s card sits just above the tab bar', () => {
    const a = anchorFor({ top: 744, left: 100, width: 97, height: 56 }, phone);
    expect(a.card).toEqual({ left: 16, right: 16, bottom: 800 - 744 + 12 });
    expect(a.pointer).toBeNull();
  });

  it('phones: a header target or a More sheet item puts the card under the header', () => {
    expect(anchorFor({ top: 12, left: 270, width: 100, height: 36 }, phone).card).toEqual({
      left: 16,
      right: 16,
      top: 64 + 12,
    });
    expect(anchorFor({ top: 540, left: 8, width: 374, height: 48 }, phone).card.top).toBe(76);
  });

  it('desktop: beside a rail item, pointing at its middle', () => {
    const a = anchorFor({ top: 300, left: 4, width: 80, height: 60 }, desktop);
    expect(a.card.left).toBe(84 + HOLE_PAD + 12);
    expect(a.card.top).toBe(330 - 100);
    expect(a.pointer).toEqual({ side: 'left', at: 100 });
  });

  it('desktop: under the credits pill, right-aligned, pointing up at it', () => {
    const a = anchorFor({ top: 12, left: 1160, width: 100, height: 36 }, desktop);
    expect(a.card).toMatchObject({ right: 20, top: 48 + HOLE_PAD + 12 });
    expect(a.pointer?.side).toBe('top');
  });

  it('keeps the card on screen near the bottom, and the ring inside the viewport', () => {
    const a = anchorFor({ top: 820, left: 4, width: 80, height: 60 }, desktop);
    expect(a.card.top).toBe(860 - 200 - 16);
    const edge = anchorFor({ top: 744, left: 0, width: 97, height: 56 }, phone);
    expect(edge.hole).toEqual({ top: 740, left: 0, width: 101, height: 60 });
  });

  it('with no target yet, the card is centred and nothing is lit', () => {
    const a = anchorFor(null, desktop);
    expect(a.hole).toBeNull();
    expect(a.card.left).toBe((1280 - CARD_W) / 2);
  });
});
