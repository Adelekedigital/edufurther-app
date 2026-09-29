import { useId } from 'react';
import { cx } from '@/lib/utils/cx';
import { Badge } from '@/components/atoms/Badge/Badge';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Switch } from '@/components/atoms/Switch/Switch';
import type { OwnSessionType } from '@/types/sessionType';
import styles from './SessionTypeRow.module.css';

type SessionTypeRowProps = {
  type: OwnSessionType;
  onLiveChange: (live: boolean) => void;
  onDelete: () => void;
  /** Where Edit goes; omitted until the edit screen ships (Session Types PR 4). */
  editHref?: string;
  /** Our copy when the last switch didn't save (the switch has already rolled back). */
  message?: string;
};

/**
 * One session type on the mentor's list (Session Types.dc.html `types` rows):
 * icon, name + Live/Hidden, two lines of description, facts, then the Live
 * switch, Edit and Delete. A hidden type is drawn on a grey ground.
 */
export function SessionTypeRow({
  type: t,
  onLiveChange,
  onDelete,
  editHref,
  message,
}: SessionTypeRowProps) {
  const nameId = useId();
  const qn = t.questionCount;
  const facts = [
    { icon: 'schedule' as const, label: `${t.durationMin} min` },
    ...(qn === null
      ? []
      : [{ icon: 'quiz' as const, label: `${qn} question${qn === 1 ? '' : 's'}` }]),
    { icon: 'sell' as const, label: t.topics.map((x) => x.label).join(', ') || 'Any topic' },
  ];
  return (
    <article className={cx(styles.row, !t.isLive && styles.hidden)} aria-labelledby={nameId}>
      <span className={styles.tile}>
        <Icon name={t.icon} size={20} />
      </span>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h2 id={nameId} className={styles.name}>
            {t.name}
          </h2>
          <Badge type="accent" size="sm" color={t.isLive ? 'green' : 'neutral'}>
            {t.isLive ? 'Live' : 'Hidden'}
          </Badge>
        </div>
        {t.description && <p className={styles.description}>{t.description}</p>}
        <ul className={styles.facts}>
          {facts.map((f) => (
            <li key={f.icon} className={styles.fact}>
              <Icon name={f.icon} size={14} className={styles.factIcon} />
              {f.label}
            </li>
          ))}
        </ul>
        {message && (
          <p role="status" className={styles.message}>
            <Icon name="error" size={16} />
            {message}
          </p>
        )}
      </div>
      <div className={styles.actions}>
        <Switch
          checked={t.isLive}
          onChange={onLiveChange}
          aria-label={`${t.name}: bookable on your profile`}
        />
        {editHref && (
          <ButtonLink
            href={editHref}
            prefetch={false}
            size="small"
            variant="secondary-outlined"
            aria-label={`Edit ${t.name}`}
          >
            Edit
          </ButtonLink>
        )}
        <IconButton
          icon="delete"
          size="sm"
          shape="square"
          tone="danger"
          aria-label={`Delete ${t.name}`}
          onClick={onDelete}
        />
      </div>
    </article>
  );
}
