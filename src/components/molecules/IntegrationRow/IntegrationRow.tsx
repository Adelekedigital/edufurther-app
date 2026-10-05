import type { ReactNode } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './IntegrationRow.module.css';

export type RowStatus = {
  /** `good` is a working connection, `warn` something the mentor must fix. */
  tone: 'good' | 'warn';
  text: string;
};

type IntegrationRowProps = {
  icon: IconName;
  tone: 'blue' | 'green';
  label: string;
  /** e.g. "Coming soon". */
  badge?: string;
  description: string;
  status?: RowStatus;
  /** Buttons, owned by the caller — the row knows nothing about connecting. */
  actions?: ReactNode;
  /** A notice under the row: why a connection stopped working. */
  footer?: ReactNode;
};

/**
 * One app in an integration list (Integrations.dc.html `g.apps`): icon tile,
 * name, what it does, and whatever the caller puts in the action slot.
 */
export function IntegrationRow({
  icon,
  tone,
  label,
  badge,
  description,
  status,
  actions,
  footer,
}: IntegrationRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.main}>
        <span aria-hidden className={cx(styles.tile, styles[tone])}>
          <Icon name={icon} size={22} />
        </span>
        <div className={styles.text}>
          <span className={styles.label}>
            {label}
            {badge && (
              <Badge type="accent" color="neutral" size="sm">
                {badge}
              </Badge>
            )}
          </span>
          <span className={styles.description}>{description}</span>
          {status && (
            <span className={cx(styles.status, styles[status.tone])}>
              <Icon name={status.tone === 'good' ? 'check_circle' : 'error'} size={16} />
              {status.text}
            </span>
          )}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
