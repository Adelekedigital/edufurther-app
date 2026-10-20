/** One saved degree as Settings › Education lists it. */
export type EducationRow = {
  id: string;
  /** The abbreviation (BSc), else the level's name; null when neither is saved. */
  degree: string | null;
  course: string;
  school: string;
  /** Years as saved; null when a date isn't. */
  start: string | null;
  end: string | null;
};

const joined = (sep: string, ...parts: (string | null)[]) => parts.filter(Boolean).join(sep);

/** "{degree}, {course}" (design `eduRows` title), without a dangling comma; else the school. */
export const educationTitle = (r: EducationRow) => joined(', ', r.degree, r.course) || r.school;

/** "{school} · {start} – {end}" (design `eduRows` meta). */
export const educationMeta = (r: EducationRow) =>
  joined(' · ', r.school, r.start && r.end ? `${r.start} – ${r.end}` : (r.start ?? r.end));

/** "{school}, {end}" for the delete confirm (design `deleteAwardSub`). */
export const educationWhere = (r: EducationRow) => joined(', ', r.school, r.end);
