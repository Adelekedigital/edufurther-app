import { Icon } from '@/components/atoms/Icon/Icon';
import { HELP_AREAS } from '@/lib/copy/onboarding';
import type { TopicOption } from '@/lib/utils/topicGroups';
import { cx } from '@/lib/utils/cx';
import styles from './HelpAreaPicker.module.css';

type HelpAreaPickerProps = {
  /** Live catalog offerings (`/catalog/service-offerings`). */
  options: TopicOption[];
  /** Picked offering ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** Most that can be picked; the rest dim once it's reached. */
  limit: number;
  /** The group's name, the step's question. */
  label: string;
  /** Id of the text that states the limit ("Choose up to 3 areas"), so dimmed cards say why. */
  describedBy?: string;
  /** Id for the first card: where focus goes when none is picked and Continue is pressed. */
  firstId?: string;
  /**
   * Id of the error line ("Pick at least one area."), when shown. Each card is
   * described by it, so the card that takes focus says why.
   */
  errorId?: string;
};

/**
 * Multi-select help-area cards (Mentee Onboarding v5.dc.html, step 1). Which
 * offerings exist comes from the catalog; their title, body, icon and order
 * come from the copy map by slug. A live slug the map doesn't know shows its
 * catalog name with no body, after the known ones (PRD H8). Holds no mentee
 * wording, so mentor onboarding can reuse it.
 */
export function HelpAreaPicker({
  options,
  value,
  onChange,
  limit,
  label,
  describedBy,
  firstId,
  errorId,
}: HelpAreaPickerProps) {
  const known = HELP_AREAS.flatMap((h) => {
    const o = options.find((x) => x.slug === h.slug);
    return o ? [{ option: o, copy: h.copy }] : [];
  });
  const unknown = options
    .filter((o) => !HELP_AREAS.some((h) => h.slug === o.slug))
    .map((o) => ({ option: o, copy: null }));
  // Only ids still in the catalog count: a dropped offering can't be unpicked.
  const full = value.filter((id) => options.some((o) => o.id === id)).length >= limit;

  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className={styles.grid}>
      {[...known, ...unknown].map(({ option, copy }, i) => {
        const on = value.includes(option.id);
        const off = !on && full;
        return (
          <button
            key={option.id}
            id={i === 0 ? firstId : undefined}
            aria-describedby={errorId}
            type="button"
            aria-pressed={on}
            aria-disabled={off || undefined}
            className={cx(styles.card, on && styles.on, off && styles.off)}
            onClick={() => {
              if (off) return;
              onChange(on ? value.filter((id) => id !== option.id) : [...value, option.id]);
            }}
          >
            <span className={styles.top}>
              <span className={styles.iconBox}>
                <Icon name={copy?.icon ?? 'help'} size={20} />
              </span>
              <Icon
                name={on ? 'check_circle' : 'radio_button_unchecked'}
                size={20}
                className={styles.tick}
              />
            </span>
            <span className={styles.title}>{copy?.title ?? option.label}</span>
            {copy && <span className={styles.body}>{copy.body}</span>}
          </button>
        );
      })}
    </div>
  );
}
