import { STARTERS } from '@/lib/copy/messages';
import { HELP_AREAS } from '@/lib/copy/onboarding';

export type Starter = { key: string; label: string; text: string };

/** What a mentee's chips are filled from (their goal; PRD "Starters", Q6). */
export type MenteeStarterData = {
  myFirst: string;
  /** DEGREE_OPTIONS value: bachelors, masters, mba, doctorate; '' when unset. */
  degree: string;
  field: string;
  term: string | null;
  /** The first help area's catalog slug, from onboarding. */
  firstNeed: string | null;
};

/**
 * The starter chips for an empty chat (PRD table). Mentees' are filled from
 * their goal and the mentor's school; a chip whose data is missing is left out.
 * Mentors' three never need data.
 */
export function startersFor(
  viewer: 'mentee' | 'mentor',
  first: string,
  data: { mentee: MenteeStarterData | null; theirInstitution: string | null },
): Starter[] {
  if (viewer === 'mentor')
    return [
      { key: 'welcome', label: STARTERS.welcome.label, text: STARTERS.welcome.text(first) },
      { key: 'documents', label: STARTERS.documents.label, text: STARTERS.documents.text(first) },
      {
        key: 'prepare',
        label: STARTERS.howToPrepare.label,
        text: STARTERS.howToPrepare.text(first),
      },
    ];
  const m = data.mentee;
  const degree = m?.degree ? STARTERS.degree[m.degree as keyof typeof STARTERS.degree] : undefined;
  const topic = m?.firstNeed
    ? HELP_AREAS.find((a) => a.slug === m.firstNeed)?.copy.reason
    : undefined;
  const out: (Starter | null)[] = [
    m && degree && m.field.trim()
      ? {
          key: 'intro',
          label: STARTERS.intro.label,
          text: STARTERS.intro.text(
            first,
            m.myFirst,
            degree,
            m.field.trim(),
            m.term?.trim() || null,
          ),
        }
      : null,
    topic
      ? { key: 'cover', label: STARTERS.cover.label, text: STARTERS.cover.text(first, topic) }
      : null,
    { key: 'ask', label: STARTERS.askPrepare.label, text: STARTERS.askPrepare.text(first) },
    data.theirInstitution
      ? {
          key: 'school',
          label: STARTERS.school.label,
          text: STARTERS.school.text(first, data.theirInstitution),
        }
      : null,
  ];
  return out.filter((s): s is Starter => s !== null);
}
