import type { StrengthTip } from '@/components/organisms/ProfileStrengthCard/ProfileStrengthCard';
import type { CompletenessCode } from '@/types/mentor';
import type { ItemTarget } from './OwnerItemEditor';

type TipActions = {
  hoursHref: string;
  typesHref: string;
  openPhoto: () => void;
  openIntro: () => void;
  openAbout: () => void;
  openItem: (target: ItemTarget) => void;
  /** Called as a tip opens its editor (the page puts focus back after). */
  onUse: (code: CompletenessCode) => void;
};

/** Our copy for each step (the design draws two sample tips only). */
const LABEL: Record<CompletenessCode, string> = {
  session_type: 'Turn on a session type',
  weekly_hours: 'Set your weekly hours',
  photo: 'Add a profile photo',
  headline: 'Add a headline',
  about: 'Write your About',
  topics: 'Add the topics you help with',
  background: 'Add where you’re from and studied',
  education: 'Add your education',
  award: 'Add a scholarship or award',
};

/**
 * The first two steps the backend lists (bookability first), each opening its
 * editor on this page, or Session types for types and hours. The design's
 * tips link to Settings, which doesn't exist (design-divergence.md).
 */
export function strengthTips(missing: CompletenessCode[], a: TipActions): StrengthTip[] {
  return missing.slice(0, 2).map((code): StrengthTip => {
    const label = LABEL[code];
    const tip = pick(code, a);
    if ('href' in tip && tip.href) return { key: code, label, href: tip.href };
    const run = tip.onSelect!;
    return {
      key: code,
      label,
      onSelect: () => {
        a.onUse(code);
        run();
      },
    };
  });
}

/** Where each step is done: a page elsewhere, or an editor here. */
function pick(code: CompletenessCode, a: TipActions): { href?: string; onSelect?: () => void } {
  switch (code) {
    case 'session_type':
      return { href: a.typesHref };
    case 'weekly_hours':
      return { href: a.hoursHref };
    case 'photo':
      return { onSelect: a.openPhoto };
    case 'headline':
      return { onSelect: a.openIntro };
    case 'about':
      return { onSelect: a.openAbout };
    case 'topics':
    case 'background':
      return { onSelect: () => a.openItem({ kind: code }) };
    case 'education':
    case 'award':
      return { onSelect: () => a.openItem({ kind: code, id: null }) };
  }
}
