/**
 * MOCK store for the owner's scholarships and awards (POST, PATCH, DELETE
 * /users/{id}/awards). Seeded from the profile the first time the owner's
 * profile is read, so edits start from what's on screen. In memory on
 * globalThis; resets on restart. ENABLE_MOCK_API=1 only.
 */
export type MockAward = {
  id: string;
  title: string;
  institution: string;
  year: number | null;
  funding: 'full' | 'partial' | null;
};

const g = globalThis as typeof globalThis & { __mockAwards?: Map<string, MockAward[]> };
const store = (g.__mockAwards ??= new Map());

export const mockAwards = (userId: string): MockAward[] | undefined => store.get(userId);
export const seedAwards = (userId: string, list: MockAward[]) => {
  if (!store.has(userId)) store.set(userId, list);
  return store.get(userId)!;
};
export const setAwards = (userId: string, list: MockAward[]) => store.set(userId, list);

/** The backend's rules for a write: a title and an institution; funding full, partial or null. */
export function awardProblem(body: Record<string, unknown>, partial: boolean): string | null {
  for (const k of ['title', 'institution'] as const) {
    if (!(k in body)) {
      if (partial) continue;
      return `/${k}`;
    }
    const v = body[k];
    if (typeof v !== 'string' || !v.trim() || v.length > 200) return `/${k}`;
  }
  if ('year' in body && body.year !== null && !Number.isInteger(body.year)) return '/year';
  if ('funding' in body && ![null, 'full', 'partial'].includes(body.funding as string | null))
    return '/funding';
  return null;
}

// ---- education -------------------------------------------------------------

/** The catalog's degree levels (backend lookups migration), with mock ids. */
export const MOCK_DEGREE_LEVELS = [
  ['undergraduate', 'Undergraduate'],
  ['diploma', 'Diploma'],
  ['masters', 'Masters'],
  ['mba', 'MBA'],
  ['phd', 'PhD'],
  ['postdoc', 'Postdoctoral'],
].map(([code, display_name]) => ({ id: `dl-${code}`, code: code!, display_name: display_name! }));

export type MockEducation = {
  id: string;
  school_name_raw: string;
  degree_abbreviation: string | null;
  degree_level_id: string | null;
  study_course: string | null;
  date_start: string | null;
  date_end: string | null;
  is_most_recent: boolean;
};

const ge = globalThis as typeof globalThis & { __mockEducation?: Map<string, MockEducation[]> };
const eduStore = (ge.__mockEducation ??= new Map());

export const mockEducation = (userId: string): MockEducation[] | undefined => eduStore.get(userId);
export const seedEducation = (userId: string, list: MockEducation[]) => {
  if (!eduStore.has(userId)) eduStore.set(userId, list);
  return eduStore.get(userId)!;
};
/** Most recent first, as the backend lists them; one marked current clears the rest. */
export function setEducation(userId: string, list: MockEducation[], currentId?: string) {
  const next = list.map((e) =>
    currentId && e.id !== currentId ? { ...e, is_most_recent: false } : e,
  );
  next.sort(
    (a, b) =>
      Number(b.is_most_recent) - Number(a.is_most_recent) ||
      (b.date_end ?? '').localeCompare(a.date_end ?? ''),
  );
  eduStore.set(userId, next);
  return next;
}

/** The owner's read (GET /users/{id}/education, profile EducationRead). */
export const educationRead = (e: MockEducation) => {
  const level = MOCK_DEGREE_LEVELS.find((l) => l.id === e.degree_level_id) ?? null;
  return {
    ...e,
    institution: null,
    degree_level: level,
    degree_category: null,
    study_program: null,
  };
};

/** The public read's row: `degree` is the abbreviation, else the level's name. */
export const educationPublic = (e: MockEducation) => ({
  id: e.id,
  degree:
    e.degree_abbreviation ??
    MOCK_DEGREE_LEVELS.find((l) => l.id === e.degree_level_id)?.display_name ??
    null,
  study_course: e.study_course,
  institution: e.school_name_raw,
  date_start: e.date_start,
  date_end: e.date_end,
});

/** The backend's rules for a degree write. */
export function educationProblem(body: Record<string, unknown>, partial: boolean): string | null {
  if (!partial || 'school_name_raw' in body) {
    const v = body.school_name_raw;
    if (typeof v !== 'string' || !v.trim() || v.length > 300) return '/school_name_raw';
  }
  if ('degree_abbreviation' in body) {
    const v = body.degree_abbreviation;
    if (v !== null && (typeof v !== 'string' || v.length > 20)) return '/degree_abbreviation';
  }
  if (
    'degree_level_id' in body &&
    body.degree_level_id !== null &&
    !MOCK_DEGREE_LEVELS.some((l) => l.id === body.degree_level_id)
  )
    return '/degree_level_id';
  for (const k of ['date_start', 'date_end'] as const)
    if (k in body && body[k] !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(body[k])))
      return `/${k}`;
  return null;
}
