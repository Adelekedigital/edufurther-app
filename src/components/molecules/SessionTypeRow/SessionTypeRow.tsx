import { useId } from 'react';
import { cx } from '@/lib/utils/cx';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Switch } from '@/components/atoms/Switch/Switch';
import type { OwnSessionType } from '@/types/sessionType';
import { CopyLinkButton } from '../CopyLinkButton/CopyLinkButton';
import { RowMenu } from '../RowMenu/RowMenu';
import styles from './SessionTypeRow.module.css';

type SessionTypeRowProps = {
  type: OwnSessionType;
  onLiveChange: (live: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  /** The public link to book this type; null until it can be built (no button). */
  shareUrl: string | null;
  /** Our copy under the row: a switch that didn't save, or what Duplicate did. */
  message?: string;
  /** info: progress or success (no error icon). */
  messageTone?: 'error' | 'info';
};

/**
 * One session type on the mentor's list (Session Types.dc.html `types` rows):
 * icon, name + Live/Hidden, two lines of description, facts, then the
 * "Visible to mentees" switch, the share link and the "⋯" menu (Edit,
 * Duplicate, Delete). A hidden type is drawn on a grey ground.
 */
export function SessionTypeRow({
  type: t,
  onLiveChange,
  onDelete,
  onEdit,
  onDuplicate,
  shareUrl,
  message,
  messageTone = 'error',
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
          <p
            role="status"
            className={cx(styles.message, messageTone === 'info' && styles.messageInfo)}
          >
            {messageTone === 'error' && <Icon name="error" size={16} />}
            {message}
          </p>
        )}
      </div>
      <div className={styles.actions}>
        <Switch
          checked={t.isLive}
          onChange={onLiveChange}
          aria-label={`Visible to mentees: ${t.name}`}
          title={t.isLive ? 'Visible to mentees' : 'Hidden from mentees'}
        />
        {shareUrl && <CopyLinkButton label={`Copy share link for ${t.name}`} url={shareUrl} />}
        <RowMenu
          label={`More actions for ${t.name}`}
          items={[
            { key: 'edit', icon: 'edit', label: 'Edit', onSelect: onEdit },
            { key: 'duplicate', icon: 'content_copy', label: 'Duplicate', onSelect: onDuplicate },
            { key: 'delete', icon: 'delete', label: 'Delete', onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </article>
  );
}
