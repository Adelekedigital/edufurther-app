import {
  effectiveWindow,
  mockCreateSessionType,
  mockEditSessionType,
  mockOwnSessionTypes,
  PLATFORM_WINDOW,
} from './sessionTypes';

describe('effectiveWindow (mock of the backend rule)', () => {
  it('uses the offering’s own window first', () => {
    expect(effectiveWindow(14, 28)).toBe(14);
  });
  it('inherits the mentor’s default when the offering has none', () => {
    expect(effectiveWindow(null, 28)).toBe(28);
  });
  it('falls back to the platform window when neither is set', () => {
    expect(effectiveWindow(null, null)).toBe(PLATFORM_WINDOW);
  });
  it('never goes past the platform cap, own or inherited', () => {
    expect(effectiveWindow(90, null)).toBe(PLATFORM_WINDOW);
    expect(effectiveWindow(null, 90)).toBe(PLATFORM_WINDOW);
  });
});

describe('mockCreateSessionType: the window, as the backend checks it', () => {
  const windowErrors = (days: number) => {
    const r = mockCreateSessionType({ name: `Window ${days}`, booking_window_days: days }, null);
    const errors = (r.ok ? [] : (r.problem.errors ?? [])) as { pointer: string }[];
    return errors.filter((e) => e.pointer === '/booking_window_days').length;
  };
  it('refuses a window above the platform cap or under 4 days; accepts one within', () => {
    expect(windowErrors(PLATFORM_WINDOW + 1)).toBe(1);
    expect(windowErrors(3)).toBe(1);
    expect(windowErrors(14)).toBe(0);
  });
});

describe('the venue (backend #535)', () => {
  const read = (id: string) => mockOwnSessionTypes().find((t) => t.id === id)!;
  it('null or absent follows the default; a pin is its own; anything else is a 422', () => {
    const r = mockCreateSessionType({ name: 'Venue pin', meeting_venue: 'google_meet' }, null);
    if (!r.ok) throw new Error('refused');
    expect(read(r.body.id)).toMatchObject({
      meeting_venue: 'google_meet',
      meeting_venue_inherited: false,
    });
    expect(mockEditSessionType(r.body.id, { meeting_venue: null }).status).toBe(200);
    // The default, resolved on read (EduFurther video until the mentor chooses).
    expect(read(r.body.id)).toMatchObject({
      meeting_venue: 'daily',
      meeting_venue_inherited: true,
    });
    expect(mockEditSessionType(r.body.id, { meeting_venue: 'custom' })).toMatchObject({
      status: 422,
      errors: [{ pointer: '/meeting_venue' }],
    });
    const bad = mockCreateSessionType({ name: 'Venue bad', meeting_venue: 'zoom' }, null);
    expect(bad.ok ? [] : bad.problem.errors).toEqual([
      expect.objectContaining({ pointer: '/meeting_venue' }),
    ]);
  });
});

describe('the removed stage fields (backend PR 543)', () => {
  it('reads carry neither; sending either, even null, is a 422 at it', () => {
    for (const t of mockOwnSessionTypes()) {
      expect(t).not.toHaveProperty('application_stage');
      expect(t).not.toHaveProperty('custom_stage_label');
    }
    for (const f of ['application_stage', 'custom_stage_label']) {
      const r = mockCreateSessionType({ name: `Removed ${f}`, [f]: null }, null);
      expect(r.ok ? [] : r.problem.errors).toEqual([expect.objectContaining({ pointer: `/${f}` })]);
    }
    const ok = mockCreateSessionType({ name: 'Removed patch' }, null);
    if (!ok.ok) throw new Error('refused');
    expect(mockEditSessionType(ok.body.id, { custom_stage_label: null })).toMatchObject({
      status: 422,
      errors: [{ pointer: '/custom_stage_label' }],
    });
  });
});
