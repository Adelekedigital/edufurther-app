import { pillLayout } from './useFloatingPrompt';

describe('pillLayout (Design decisions: float behaviour, final)', () => {
  const s = { passed: true, nearEnd: false, lift: 24, isMobile: false };
  it('browsing: full pill, centred', () => {
    expect(pillLayout(s, false)).toEqual({ size: 'full', dock: 'center', bottom: '24px' });
  });
  it('desktop near the pager: full pill docks right and rides above the pager', () => {
    expect(pillLayout({ ...s, nearEnd: true, lift: 140 }, false)).toEqual({
      size: 'full',
      dock: 'corner',
      bottom: '140px',
    });
  });
  it('phone near the pager: collapses to the round icon', () => {
    expect(pillLayout({ ...s, nearEnd: true, isMobile: true }, false).size).toBe('mini');
  });
  it('× minimises on every screen size', () => {
    expect(pillLayout(s, true)).toMatchObject({ size: 'mini', dock: 'corner' });
  });
});
