import type { EducationEntry } from '@/types/mentor';

/**
 * The new mentee's Home (Mentee Dashboard v2.dc.html, newHome nextStep): the
 * four profile details mentors read, the stage the next-step card is at, and
 * the Getting started rows. Pure, so the rules are tested apart from the page.
 */

export type ProfileKey = 'target' | 'help' | 'education' | 'bio';

export type ProfileField = {
  key: ProfileKey;
  label: string;
  /** The saved value as text; null when it isn't saved yet. */
  value: string | null;
  /** The bio is still the unedited draft from onboarding. */
  drafted?: boolean;
};

export type ProfileInput = {
  /** "Master’s" (our words for the saved level), or null. */
  degree: string | null;
  field: string | null;
  /** The first goal country's name, or null. */
  country: string | null;
  /** The goal's help areas, in catalogue words. */
  helpAreas: string[];
  education: EducationEntry[];
  bio: string;
  bioDrafted: boolean;
};

/** "Master’s in Public Health, United Kingdom"; null with no degree or field. */
export function targetText(p: Pick<ProfileInput, 'degree' | 'field' | 'country'>): string | null {
  const what = p.degree && p.field ? `${p.degree} in ${p.field}` : (p.degree ?? p.field);
  if (!what) return null;
  return p.country ? `${what}, ${p.country}` : what;
}

/** "BSc Microbiology · University of Lagos · 2024": the most recent entry, else the first. */
export function educationText(entries: EducationEntry[]): string | null {
  const e = entries.find((x) => x.values.current) ?? entries[0];
  if (!e) return null;
  const v = e.values;
  const degree = [v.degree === 'Other' ? (e.levelName ?? '') : v.degree, v.course]
    .filter(Boolean)
    .join(' ');
  return [degree, v.school, String(v.end)].filter(Boolean).join(' · ');
}

/** The four details, in the design's order. A detail is done when it's saved and not empty. */
export function profileFields(p: ProfileInput): ProfileField[] {
  const bio = p.bio.trim();
  return [
    { key: 'target', label: 'What you’re applying for', value: targetText(p) },
    {
      key: 'help',
      label: 'What you need help with',
      value: p.helpAreas.length ? p.helpAreas.join(', ') : null,
    },
    { key: 'education', label: 'Education', value: educationText(p.education) },
    { key: 'bio', label: 'Short bio', value: bio || null, drafted: !!bio && p.bioDrafted },
  ];
}

export const doneCount = (fields: ProfileField[]) => fields.filter((f) => f.value).length;

/** "Next: what you’re applying for": the first detail not done, as the meter names it. */
export const nextMissing = (fields: ProfileField[]) =>
  fields.find((f) => !f.value)?.label.toLowerCase() ?? null;

/** The first request or booking, for "Requested with {First} · {time}". */
export type FirstBooking = { mentorFirst: string; startsAt: string; confirmed: boolean };
/**
 * The first completed session, for "Done with {First} on {date}". Known from
 * /me's count; the name and date come from history, null until it answers.
 */
export type FirstSession = { mentorFirst: string | null; startsAt: string | null };

export type Stage = 'incomplete' | 'ready' | 'booked' | 'firstDone';

export type NewMenteeState = {
  profileDone: boolean;
  booked: FirstBooking | null;
  firstDone: FirstSession | null;
  /** The invite link was copied or shared (remembered on this device). */
  invited: boolean;
  friendJoined: boolean;
  /** 3 free sessions a month are on: the invite step is done, whatever this device remembers. */
  unlocked?: boolean;
};

/** Which next-step card shows (design NX), and whether it says "One step left". */
export function stageFor(s: NewMenteeState): { stage: Stage; oneStepLeft: boolean } {
  if (s.firstDone) return { stage: 'firstDone', oneStepLeft: false };
  if (s.booked) {
    // Booked and the link shared, with the profile still short: the profile is what's left.
    if (s.invited && !s.profileDone) return { stage: 'incomplete', oneStepLeft: true };
    return { stage: 'booked', oneStepLeft: false };
  }
  return { stage: s.profileDone ? 'ready' : 'incomplete', oneStepLeft: false };
}

/** The three steps Getting started tracks (account creation is always done). */
export function stepsDone(s: NewMenteeState) {
  const booked = !!s.firstDone || !!s.booked;
  const invite = s.invited || s.friendJoined || !!s.unlocked;
  return { profile: s.profileDone, booked, invite, all: s.profileDone && booked && invite };
}
