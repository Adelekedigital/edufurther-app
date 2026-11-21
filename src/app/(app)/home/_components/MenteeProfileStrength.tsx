import {
  ProfileStrengthCard,
  type StrengthTip,
} from '@/components/organisms/ProfileStrengthCard/ProfileStrengthCard';
import { PROFILE_TIPS } from '@/lib/copy/home';
import { GOALS_HREF, doneCount, type ProfileField } from './newMentee';

/** The card's id: focus goes to its next tip after a tip's step is done. */
export const STRENGTH_ID = 'home-profile-strength';

type MenteeProfileStrengthProps = {
  /** The four details' read; only `ready` says anything about the profile. */
  status: 'loading' | 'error' | 'ready';
  fields: ProfileField[];
  /** The Education editor (the profile sheet's). */
  onEducation: () => void;
  /** The profile sheet, opened in its bio editor. */
  onBio: () => void;
};

/**
 * The full Home's to-do for a short profile (owner, 21 Nov 2026): the shared
 * Profile strength card, one tip per missing detail, opening the editors the
 * new view's profile sheet uses. Nothing while the details load or fail (a
 * wrong percent is worse than none) or once all four are done.
 */
export function MenteeProfileStrength({
  status,
  fields,
  onEducation,
  onBio,
}: MenteeProfileStrengthProps) {
  if (status !== 'ready') return null;
  const done = doneCount(fields);
  if (done === fields.length) return null;
  const tips = fields
    .filter((f) => !f.value)
    .map((f): StrengthTip => {
      const label = PROFILE_TIPS[f.key];
      // The goal rows are edited in Settings › Goals, as the sheet's rows are.
      if (f.key === 'target' || f.key === 'help') return { key: f.key, label, href: GOALS_HREF };
      return { key: f.key, label, onSelect: f.key === 'education' ? onEducation : onBio };
    });
  return (
    <ProfileStrengthCard id={STRENGTH_ID} percent={(done / fields.length) * 100} tips={tips} />
  );
}

/**
 * After a tip's dialog closes: the tip named `label` while it's still there
 * (the step isn't done), else the next tip, else the page title. Only when the
 * closing dialog left focus nowhere.
 */
export function focusAfterTip(title: HTMLElement | null, label?: string) {
  if (document.activeElement && document.activeElement !== document.body) return;
  const tips = [
    ...(document.getElementById(STRENGTH_ID)?.querySelectorAll<HTMLElement>('a, button') ?? []),
  ];
  const same = label ? tips.find((t) => t.textContent?.includes(label)) : undefined;
  (same ?? tips[0] ?? title)?.focus();
}
