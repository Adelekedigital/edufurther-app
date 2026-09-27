import { pillLayout, type FloatingPromptState } from './useFloatingPrompt';

/** Desktop 1440 wide; pager button centred 300–460px, its centre 100px above the bottom. */
const desk: FloatingPromptState = {
  passed: true,
  nearEnd: false,
  isMobile: false,
  mobileBottom: 72,
  viewportWidth: 1440,
  lift: 24,
  buttonCenter: 100,
  buttonRight: 460,
  pillWidth: 400,
  pillHeight: 48,
};
/** Phone 390 wide; "Show more mentors" 120–270px. */
const phone: FloatingPromptState = {
  ...desk,
  isMobile: true,
  viewportWidth: 390,
  buttonRight: 270,
  pillWidth: 358,
};

describe('pillLayout (Design decisions: float behaviour, final)', () => {
  it('browsing: full pill, centred, at the floor', () => {
    expect(pillLayout(desk, false)).toEqual({
      size: 'full',
      dock: 'center',
      bottom: '24px',
      tracking: false,
    });
  });

  it('× minimises on every screen size', () => {
    expect(pillLayout(desk, true)).toMatchObject({ size: 'mini', dock: 'corner' });
    expect(pillLayout(phone, true)).toMatchObject({ size: 'mini', dock: 'corner' });
  });

  it('phone near the pager: collapses to the round icon', () => {
    expect(pillLayout({ ...phone, nearEnd: true }, false).size).toBe('mini');
  });
});

describe('pillLayout — docked pill lines up with "Show more mentors"', () => {
  it('desktop full pill beside the button when it fits: centred on the button', () => {
    // left = 1440 - 24 - 400 = 1016 ≥ 460 + 16 → fits; bottom = 100 - 48/2 = 76
    expect(pillLayout({ ...desk, nearEnd: true }, false)).toEqual({
      size: 'full',
      dock: 'corner',
      bottom: '76px',
      tracking: true,
    });
  });

  it('desktop full pill that would crowd the button sits 12px above the pager', () => {
    // 1000 wide: left = 1000 - 24 - 600 = 376 < 476 → does not fit
    const narrow = { ...desk, nearEnd: true, viewportWidth: 1000, pillWidth: 600, lift: 140 };
    expect(pillLayout(narrow, false).bottom).toBe('140px');
  });

  it('phone round icon sits on the button line, in the corner', () => {
    // left = 390 - 16 - 48 = 326 ≥ 286 → fits; bottom = 200 - 24 = 176 (above the 72 floor)
    expect(pillLayout({ ...phone, nearEnd: true, buttonCenter: 200 }, false)).toMatchObject({
      size: 'mini',
      dock: 'corner',
      bottom: '176px',
    });
  });

  it('never drops below the tab bar', () => {
    const low = pillLayout({ ...phone, nearEnd: true, buttonCenter: 40 }, false);
    expect(low.bottom).toBe('calc(72px + env(safe-area-inset-bottom))');
  });

  it('guests have no tab bar, so the phone floor is lower', () => {
    const guest = { ...phone, mobileBottom: 16 };
    expect(pillLayout(guest, false).bottom).toBe('calc(16px + env(safe-area-inset-bottom))');
  });
});
