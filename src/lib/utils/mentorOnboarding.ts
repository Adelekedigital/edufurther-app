import type { DayHours } from '@/lib/utils/sessionTypeDraft';
import type { MentorAnswers, MentorGap, MentorStep, SchoolDraft } from '@/types/mentorOnboarding';

/**
 * The design's degree chips, in its order. `code` is the catalogue level
 * (backend degree_levels slugs); `raw` the abbreviation saved with it, as in
 * mentee onboarding H8 (MBA = masters + "MBA", HND = diploma + "HND").
 */
export const MENTOR_DEGREES: { value: string; label: string; code: string; raw: string }[] = [
  { value: 'hnd', label: 'HND', code: 'diploma', raw: 'HND' },
  { value: 'bachelors', label: 'Bachelor’s', code: 'bachelors', raw: 'Bachelor’s' },
  { value: 'masters', label: 'Master’s', code: 'masters', raw: 'Master’s' },
  { value: 'mba', label: 'MBA', code: 'masters', raw: 'MBA' },
  { value: 'phd', label: 'PhD', code: 'doctorate', raw: 'PhD' },
];

/** The profile editor's abbreviations (lib/utils/degrees.ts), on the chip each one sits under. */
const SAVED_ALIASES: Record<string, string> = {
  bsc: 'bachelors',
  ba: 'bachelors',
  msc: 'masters',
  ma: 'masters',
  mph: 'masters',
  meng: 'masters',
};

/** The profile editor's level codes, where they differ from the catalogue's. */
const LEVEL_ALIASES: Record<string, string> = { undergraduate: 'bachelors', phd: 'doctorate' };

/** A saved entry's degree back to a chip: by abbreviation, then by level alone. */
export function mentorDegreeFromSaved(
  abbreviation: string | null | undefined,
  levelCode: string | null | undefined,
) {
  const raw = abbreviation?.trim().toLowerCase();
  const byRaw = raw
    ? MENTOR_DEGREES.find((d) => d.raw.toLowerCase() === raw || d.label.toLowerCase() === raw)
    : undefined;
  if (byRaw) return byRaw.value;
  if (raw && SAVED_ALIASES[raw]) return SAVED_ALIASES[raw];
  const code = (levelCode && LEVEL_ALIASES[levelCode]) ?? levelCode;
  // MBA and Master's share a level: the plain one when only the level is known.
  return MENTOR_DEGREES.find((d) => d.code === code && d.value !== 'mba')?.value ?? '';
}

export const degreeLabel = (value: string) =>
  MENTOR_DEGREES.find((d) => d.value === value)?.label ?? '';

/**
 * One year as the API's date. The saved date stays while its year is
 * unchanged (it may carry a month from the profile editor); a new year is
 * Jan 1 for a start and Dec 31 for an end (PRD F1).
 */
export function yearToApiDate(year: string, saved: string | null, edge: 'start' | 'end'): string {
  if (saved && saved.slice(0, 4) === year) return saved;
  return edge === 'start' ? `${year}-01-01` : `${year}-12-31`;
}

export const yearOf = (date: string | null | undefined) => date?.slice(0, 4) ?? '';

/** The design's 40 years, newest first: start years stop at this year, end years run 4 ahead. */
export function yearOptions(kind: 'start' | 'end', thisYear: number, from = ''): string[] {
  const top = thisYear + 4;
  const all = Array.from({ length: 40 }, (_, i) => String(top - i));
  return kind === 'start'
    ? all.filter((y) => +y <= thisYear)
    : all.filter((y) => !from || +y >= +from);
}

/** "{degree} {field} · {school}" from the current school (PRD: saved, no field on screen). */
export function headlineFor(s: SchoolDraft | undefined): string {
  if (!s) return '';
  const lead = [degreeLabel(s.degree), s.field.trim()].filter(Boolean).join(' ');
  return [lead, s.school.trim()].filter(Boolean).join(' · ');
}

const LINKEDIN = /^(?:https?:\/\/)?(?:[a-z]{1,3}\.)?linkedin\.com\/in\/([^/?#\s]+)\/?(?:[?#].*)?$/i;

export const isLinkedInProfile = (url: string) => LINKEDIN.test(url.trim());

/** Saved in one form, so the reviewer's link always opens. */
export function normaliseLinkedIn(url: string): string {
  const m = LINKEDIN.exec(url.trim());
  return m ? `https://www.linkedin.com/in/${m[1]}` : url.trim();
}

export const currentSchool = (schools: SchoolDraft[]) =>
  schools.find((s) => s.current) ?? schools[0];

let seq = 0;
export function defaultSchool(current = false): SchoolDraft {
  seq += 1;
  return {
    key: `new-${seq}`,
    id: null,
    school: '',
    institutionId: null,
    catalogCountryId: null,
    countryId: '',
    countryOpen: false,
    degree: '',
    field: '',
    start: '',
    end: '',
    current,
  };
}

export const schoolCountry = (s: SchoolDraft) => s.countryId || s.catalogCountryId || '';

const basicsDone = (s: SchoolDraft) =>
  !!s.school.trim() && !!s.degree && !!s.field.trim() && !!s.start && !!s.end;

/**
 * A school needs a country (design `eduOk`). The API keeps a typed school's
 * country only as the current one's study country, so an older saved school
 * without a catalogue match isn't asked again on resume.
 */
export const needsCountry = (s: SchoolDraft) =>
  !schoolCountry(s) && (s.current || s.id === null || s.countryOpen);

/** What the step's Continue finds missing, in the order the fields show. */
export function gapsFor(step: MentorStep, a: MentorAnswers): MentorGap[] {
  switch (step) {
    case 'help':
      return a.helpIds.length ? [] : ['help'];
    case 'education':
      if (!a.schools.length || !a.schools.every(basicsDone)) return ['education'];
      return a.schools.some(needsCountry) ? ['studyCountry'] : [];
    case 'about': {
      const gaps: MentorGap[] = [];
      if (!a.photoUrl) gaps.push('photo');
      if (!a.originId) gaps.push('origin');
      if (!a.linkedin.trim()) gaps.push('linkedin');
      else if (!isLinkedInProfile(a.linkedin)) gaps.push('linkedinFormat');
      return gaps;
    }
    case 'hours':
      return a.days.length && a.to > a.from ? [] : ['days'];
  }
}

// ---- hours -----------------------------------------------------------------

export const DEFAULT_FROM = 18 * 60;
export const DEFAULT_TO = 21 * 60;

/** Start times every half hour up to 11:00 pm (the design's list stops there). */
export const fromOptions = (): number[] => Array.from({ length: 47 }, (_, i) => i * 30);

/** End times from 30 minutes after the start up to midnight (1440). */
export const toOptions = (from: number): number[] =>
  Array.from({ length: 49 }, (_, i) => i * 30).filter((m) => m >= from + 30);

/** 1080 → "6:00 pm"; 1440 (midnight) → "12:00 am". */
export function formatTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** A moved start keeps the range's length (design `setHFrom`), never past midnight. */
export function moveFrom(from: number, to: number, next: number) {
  const len = to - from;
  return { from: next, to: Math.min(1440, Math.max(next + 30, next + len)) };
}

/** Monday-first picks → the Sunday-first week weeklyHours.ts saves (backend 0 = Sunday). */
export function toDayHours(days: number[], from: number, to: number): DayHours[] {
  return Array.from({ length: 7 }, (_, sun) => {
    const mon = (sun + 6) % 7;
    return days.includes(mon) ? { on: true, slots: [[from, to]] } : { on: false, slots: [] };
  });
}

/**
 * Saved hours back to days and one range: the most common range wins (step 4
 * offers one range for every day). Days without it aren't picked.
 */
export function fromWeeklyHours(w: { days: DayHours[] } | null): {
  days: number[];
  from: number;
  to: number;
} {
  const counts = new Map<string, number>();
  w?.days.forEach((d) => {
    if (d.on)
      for (const [a, b] of d.slots) counts.set(`${a}-${b}`, (counts.get(`${a}-${b}`) ?? 0) + 1);
  });
  const top = [...counts].sort((x, y) => y[1] - x[1])[0]?.[0];
  if (!w || !top) return { days: [], from: DEFAULT_FROM, to: DEFAULT_TO };
  const [from, to] = top.split('-').map(Number) as [number, number];
  const days = w.days.flatMap((d, sun) =>
    d.on && d.slots.some(([a, b]) => a === from && b === to) ? [(sun + 6) % 7] : [],
  );
  return { days: days.sort((a, b) => a - b), from, to };
}
