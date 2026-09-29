import { deriveLabel } from './labels';
import { toFocus, toMentor } from './mentors';

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
  it('maps the wire shape to the card', () => {
    const m = toMentor(row());
    expect(m.name).toBe('Ada Okonkwo');
    expect(m.initials).toBe('AO');
    expect(m.degreeLine).toBe('MSc, Data Science');
    expect(m.profileHref).toBe('/mentors/ada-o');
    expect(m.label).toBe('new');
    expect(m.tone).toBeGreaterThanOrEqual(1);
    expect(m.tone).toBeLessThanOrEqual(6);
  });
  it('falls back to the id for the profile link and copes with missing names', () => {
    const m = toMentor(row({ slug: null, first_name: null, last_name: null }));
    expect(m.profileHref).toBe('/mentors/abc');
    expect(m.name).toBe('EduFurther mentor');
  });
  it('keeps the tone stable for an id', () => {
    expect(toMentor(row()).tone).toBe(toMentor(row()).tone);
  });
});

describe('toFocus (backend avatar_focus, #240)', () => {
  it('passes a 0–1 point through', () => {
    expect(toFocus({ x: 0.42, y: 0.3 })).toEqual({ x: 0.42, y: 0.3 });
  });
  it('clamps out-of-range values', () => {
    expect(toFocus({ x: -0.2, y: 1.4 })).toEqual({ x: 0, y: 1 });
  });
  it('null, missing or malformed → null (CSS default crop)', () => {
    expect(toFocus(null)).toBeNull();
    expect(toFocus(undefined)).toBeNull();
    expect(toFocus({ x: Number.NaN, y: 0.5 })).toBeNull();
  });
  it('toMentor carries it', () => {
    expect(toMentor(row({ avatar_focus: { x: 0.5, y: 0.2 } })).photoFocus).toEqual({
      x: 0.5,
      y: 0.2,
    });
    expect(toMentor(row()).photoFocus).toBeNull();
  });
});
