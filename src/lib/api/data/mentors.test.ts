import { deriveLabel } from './labels';
import { coverFor } from '@/lib/utils/cover';
import { joinPages, toMentor } from './mentors';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'abc',
  slug: 'ada-o',
  first_name: 'Ada',
  last_name: 'Okonkwo',
  taking_bookings: true,
  degree: 'MSc',
  study_course: 'Data Science',
  institution: 'University of Manchester',
  avatar_url: null,
  cover_art: 'none' as const,
  completed_sessions: 0,
  review_count: 0,
  session_value: null,
  offerings: [{ slug: 'application-documents', display_name: 'Application documents' }],
  next_available_at: null,
  next_available_state: 'refreshing' as const,
  joined_at: '2026-09-01T12:00:00Z',
  ...over,
});

describe('deriveLabel (Design decisions §9)', () => {
  it('Top-rated needs rating ≥ 4.8 AND ≥ 10 reviews', () => {
    expect(deriveLabel({ rating: 4.8, reviewCount: 10, completedSessions: 5 })).toBe('top-rated');
    expect(deriveLabel({ rating: 4.9, reviewCount: 9, completedSessions: 5 })).toBeNull();
  });
  it('Top-rated outranks Experienced', () => {
    expect(deriveLabel({ rating: 5, reviewCount: 20, completedSessions: 80 })).toBe('top-rated');
  });
  it('Experienced at ≥ 50 sessions', () => {
    expect(deriveLabel({ rating: 4.1, reviewCount: 3, completedSessions: 50 })).toBe('experienced');
  });
  it('New mentor at 0–2 sessions with no reviews', () => {
    expect(deriveLabel({ rating: null, reviewCount: 0, completedSessions: 2 })).toBe('new');
    expect(deriveLabel({ rating: null, reviewCount: 0, completedSessions: 3 })).toBeNull();
  });
});

describe('toMentor', () => {
  it('a refreshing reply that carries a time shows neither: state and time agree (backend 526)', () => {
    const m = toMentor(
      row({ next_available_state: 'refreshing', next_available_at: '2026-10-23T09:00:00Z' }),
    );
    expect(m.nextAvailableState).toBe('unknown');
    expect(m.nextAvailableAt).toBeNull();
  });

  it('maps the wire shape to the card', () => {
    const m = toMentor(row());
    expect(m.name).toBe('Ada Okonkwo');
    expect(m.initials).toBe('AO');
    expect(m.degreeLine).toBe('MSc, Data Science');
    expect(m.profileHref).toBe('/mentors/ada-o');
    expect(m.label).toBe('new');
    expect(m.cover).toBe(coverFor('abc'));
  });
  it('falls back to the id for the profile link and copes with missing names', () => {
    const m = toMentor(row({ slug: null, first_name: null, last_name: null }));
    expect(m.profileHref).toBe('/mentors/abc');
    expect(m.name).toBe('EduFurther mentor');
    expect(m.initials).toBe('E');
  });
  it('one name: its first letter', () => {
    expect(toMentor(row({ last_name: null })).initials).toBe('A');
    expect(toMentor(row({ first_name: null })).initials).toBe('O');
  });
  it('carries whether anyone can book them; absent reads as bookable', () => {
    expect(toMentor(row({ taking_bookings: false })).takingBookings).toBe(false);
    expect(toMentor(row({ taking_bookings: true })).takingBookings).toBe(true);
    const { taking_bookings: _dropped, ...absent } = row();
    expect(toMentor(absent as ReturnType<typeof row>).takingBookings).toBe(true);
  });
  it('takes their chosen cover (backend #511), else the one the id gives', () => {
    expect(toMentor(row({ id: 'x1', cover_color: 'lilac' })).cover).toBe('lilac');
    expect(toMentor(row({ id: 'x1', cover_color: null })).cover).toBe(coverFor('x1'));
    // A value we don't know is never used as a colour.
    expect(toMentor(row({ id: 'x1', cover_color: 'red;}' })).cover).toBe(coverFor('x1'));
  });
});

describe('avatar_focus (backend #240; the clamp is clampFocus)', () => {
  it('toMentor carries it, clamped', () => {
    expect(toMentor(row({ avatar_focus: { x: -0.2, y: 1.4 } })).photoFocus).toEqual({ x: 0, y: 1 });
    expect(toMentor(row({ avatar_focus: { x: 0.5, y: 0.2 } })).photoFocus).toEqual({
      x: 0.5,
      y: 0.2,
    });
    expect(toMentor(row()).photoFocus).toBeNull();
  });
});

describe('joinPages', () => {
  it('shows each mentor once, where they first appeared, when a later page repeats them', () => {
    const a = toMentor(row({ id: 'a' }));
    const b = toMentor(row({ id: 'b' }));
    const c = toMentor(row({ id: 'c' }));
    expect(
      joinPages([
        [a, b],
        [b, c],
      ]).map((m) => m.id),
    ).toEqual(['a', 'b', 'c']);
    expect(joinPages([])).toEqual([]);
  });
  it('keeps the first place but the latest data: a mentor who stopped taking bookings shows it', () => {
    const before = toMentor(row({ id: 'a', taking_bookings: true }));
    const after = toMentor(row({ id: 'a', taking_bookings: false }));
    const b = toMentor(row({ id: 'b' }));
    const joined = joinPages([[before, b], [after]]);
    expect(joined.map((m) => m.id)).toEqual(['a', 'b']);
    expect(joined[0]!.takingBookings).toBe(false);
  });
});
