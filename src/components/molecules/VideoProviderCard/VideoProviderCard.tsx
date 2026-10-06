import { Badge } from '@/components/atoms/Badge/Badge';
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
  onChange: () => void;
  icon: IconName;
  /** The glyph's colour. Each provider has its own in the design. */
  tone: 'blue' | 'green';
  label: string;
  /** Who runs it, e.g. "Built in · powered by Daily". */
  by: string;
  description: string;
  /** A reason to pick it, with a green check. */
  benefit?: string;
  /** A cost of picking it, with a yellow info glyph. */
  note?: string;
  /** What the card says when it is *not* the current choice. */
  idleStatus: string;
  recommended?: boolean;
};

/**
 * One video provider, drawn as a radio card (Integrations.dc.html `video`).
 * A native radio inside a label: the whole card is the hit area, and arrow
 * keys move between cards without a roving tabindex.
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
  note,
  idleStatus,
  recommended,
}: VideoProviderCardProps) {
  return (
    <label className={cx(styles.card, checked && styles.on)}>
      <span className={styles.head}>
        <span aria-hidden className={cx(styles.tile, styles[tone])}>
          <Icon name={icon} size={22} />
        </span>
        <span className={styles.heading}>
          <span className={styles.label}>{label}</span>
          <span className={styles.by}>{by}</span>
        </span>
        <Radio name={name} value={value} checked={checked} onChange={onChange} />
      </span>
      <span className={styles.description}>{description}</span>
      {benefit && (
        <span className={styles.line}>
          <Icon name="check_circle" size={16} className={styles.benefitIcon} />
          {benefit}
        </span>
      )}
      {note && (
        <span className={styles.line}>
          <Icon name="info" size={16} className={styles.noteIcon} />
          {note}
        </span>
      )}
      <span className={styles.footer}>
        <span className={cx(styles.status, checked && styles.statusOn)}>
          <Icon name={checked ? 'check_circle' : 'radio_button_unchecked'} size={16} />
          {checked ? 'Used for new bookings' : idleStatus}
        </span>
        {recommended && (
          <Badge type="accent" color="primary" size="sm">
            Recommended
          </Badge>
        )}
      </span>
    </label>
  );
}
