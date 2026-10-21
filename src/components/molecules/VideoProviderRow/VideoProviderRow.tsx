import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Radio } from '@/components/atoms/Radio/Radio';
import { cx } from '@/lib/utils/cx';
import styles from './VideoProviderRow.module.css';

type VideoProviderRowProps = {
  /** Shared with the recommended card, so the whole group is one tab stop. */
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  icon: IconName;
  tone: 'blue' | 'green';
  label: string;
  /** The trade-off of picking it, in one line. */
  note?: string;
};

/**
 * An alternative video provider, drawn compact under the recommended card
 * (Integrations.dc.html `videoLayout=primary`, `vOthers`).
 *
 * Not `IntegrationRow`: that one is a 40px-tile app row with an action slot and
 * a status line, and bending it into a 32px radio row would mean adding
 * appearance flags to a component four other rows depend on. Not
 * `VideoProviderCard` either — the difference in size is the whole point of
 * the layout, so it is two shapes rather than one with a size prop.
 */
export function VideoProviderRow({
  name,
  value,
  checked,
  onChange,
  icon,
  tone,
  label,
  note,
}: VideoProviderRowProps) {
  return (
    <label className={cx(styles.row, checked && styles.on)}>
      <span aria-hidden className={cx(styles.tile, styles[tone])}>
        <Icon name={icon} size={18} />
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {note && <span className={styles.note}>{note}</span>}
      </span>
      <Radio name={name} value={value} checked={checked} onChange={onChange} />
    </label>
  );
}
