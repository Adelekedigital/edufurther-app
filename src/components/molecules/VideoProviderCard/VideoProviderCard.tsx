import { Badge } from '@/components/atoms/Badge/Badge';
import { cardClass } from '@/components/atoms/Card/Card';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Radio } from '@/components/atoms/Radio/Radio';
import { cx } from '@/lib/utils/cx';
import styles from './VideoProviderCard.module.css';

type VideoProviderCardProps = {
  /** Shared across the group, so the browser gives arrow keys and one tab stop. */
  name: string;
  value: string;
  checked: boolean;
  /** Left out for a provider that can be shown but not chosen (a retired one). */
  onChange?: () => void;
  icon: IconName;
  /** The glyph's colour. Each provider has its own in the design. */
  tone: 'blue' | 'green';
  label: string;
  /** Who runs it, e.g. "Built in · powered by Daily". */
  by?: string;
  description: string;
  /** A reason to pick it, with the `monitoring` glyph. */
  benefit?: string;
  recommended?: boolean;
};

/**
 * The recommended video provider, drawn large (Integrations.dc.html
 * `videoLayout=primary`, `vMain`). Its alternatives are `VideoProviderRow`:
 * the layout is what marks this one as the recommendation, so the two are
 * deliberately different shapes rather than one card with a size prop.
 *
 * A native radio inside a label: the whole card is the hit area, and arrow
 * keys move between card and rows without a roving tabindex. With no
 * `onChange` the radio is read-only — it shows what the account is set to
 * (a personal link) without offering a choice the page cannot honour.
 *
 * The design locks this card until Google Calendar is connected. We never do —
 * Meet links are minted on EduFurther's calendar, not the mentor's (backend
 * calendar reply #2), so there is nothing to wait for.
 */
export function VideoProviderCard({
  name,
  value,
  checked,
  onChange,
  icon,
  tone,
  label,
  by,
  description,
  benefit,
  recommended,
}: VideoProviderCardProps) {
  return (
    <label
      className={cardClass({
        padding: 'lg',
        className: cx(styles.card, checked && styles.on, !onChange && styles.readOnly),
      })}
    >
      <span className={styles.head}>
        <span aria-hidden className={cx(styles.tile, styles[tone])}>
          <Icon name={icon} size={26} />
        </span>
        <span className={styles.heading}>
          <span className={styles.label}>
            {label}
            {recommended && (
              <Badge type="accent" color="primary" size="sm">
                Recommended
              </Badge>
            )}
          </span>
          {by && <span className={styles.by}>{by}</span>}
        </span>
        {/* `readOnly` is React's own answer to a controlled field with no
            handler. On a radio it changes no behaviour: the only card without
            one is the checked card, and clicking a checked radio does nothing
            either way. */}
        <Radio
          name={name}
          value={value}
          checked={checked}
          {...(onChange ? { onChange } : { readOnly: true })}
        />
      </span>
      <span className={styles.description}>{description}</span>
      {benefit && (
        <span className={styles.benefit}>
          <Icon name="monitoring" size={18} className={styles.benefitIcon} />
          {benefit}
        </span>
      )}
    </label>
  );
}
