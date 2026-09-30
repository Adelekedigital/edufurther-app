import { useEffect, useId, useRef } from 'react';
import { cx } from '@/lib/utils/cx';
import { formatShortDate } from '@/lib/utils/format';
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
  /** Mark as / remove from featured (the menu); absent while hidden (hiding un-features) or while deletion is scheduled. */
  onFeature: (featured: boolean) => void;
  /** Cancel a scheduled deletion (the row's "Keep it"). */
  onRestore: () => void;
  onDuplicate: () => void;
  /** The public link to book this type; null until it can be built (no button). */
  shareUrl: string | null;
  /** Our copy under the row: a switch that didn't save, or what Duplicate did. */
  message?: string;
  /** info: progress or success (no error icon). */
  messageTone?: 'error' | 'info';
  /** "Keep it" was clicked and hasn't answered: a second click does nothing. */
  restoring?: boolean;
  /** Put focus on the "⋯" button (the row above or below was removed). */
  focusMenu?: boolean;
  onFocused?: () => void;
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
  onFeature,
  onRestore,
  onDuplicate,
  shareUrl,
  message,
  messageTone = 'error',
  restoring = false,
  focusMenu = false,
  onFocused,
}: SessionTypeRowProps) {
  const nameId = useId();
  const pending = t.pendingDeletion;
  const switchRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  // "Keep it" unmounts when it works: focus moves to the switch it gives back,
  // the next thing the mentor needs (it comes back hidden).
  const kept = useRef(false);
  useEffect(() => {
    if (pending || !kept.current) return;
    kept.current = false;
    switchRef.current?.focus();
  }, [pending]);
  // A restore that failed leaves the row scheduled: forget the click, so a
  // later refetch clearing the deletion doesn't pull focus here.
  const wasRestoring = useRef(false);
  useEffect(() => {
    if (wasRestoring.current && !restoring && pending) kept.current = false;
    wasRestoring.current = restoring;
  }, [restoring, pending]);
  useEffect(() => {
    if (!focusMenu) return;
    menuRef.current?.focus();
    onFocused?.();
  }, [focusMenu, onFocused]);
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
          <Badge type="accent" size="sm" color={pending ? 'red' : t.isLive ? 'green' : 'neutral'}>
            {pending ? 'Scheduled for deletion' : t.isLive ? 'Live' : 'Hidden'}
          </Badge>
          {t.isFeatured && (
            // The design's orange is banned in product UI: our blue accent (design-divergence.md).
            <Badge type="accent" size="sm" color="primary">
              Featured
            </Badge>
          )}
        </div>
        {t.description && <p className={styles.description}>{t.description}</p>}
        {pending && (
          <p className={styles.pending}>
            <Icon name="schedule" size={16} className={styles.pendingIcon} />
            <span className={styles.pendingText}>{pendingNote(pending)}</span>
            {/* aria-label, not an sr-only span: browsers read that span as a block ("Keep it : name"). */}
            <button
              type="button"
              className={styles.keep}
              onClick={() => {
                if (restoring) return;
                kept.current = true;
                onRestore();
              }}
              aria-label={`Keep it: ${t.name}`}
              aria-disabled={restoring || undefined}
            >
              Keep it
            </button>
          </p>
        )}
        <ul className={styles.facts}>
          {facts.map((f) => (
            <li key={f.icon} className={styles.fact}>
              <Icon name={f.icon} size={14} className={styles.factIcon} />
              {f.label}
            </li>
          ))}
        </ul>
        {message && (
          // Announced by the page's LiveRegion, not here: a region inserted with its text is often missed.
          <p className={cx(styles.message, messageTone === 'info' && styles.messageInfo)}>
            {messageTone === 'error' && <Icon name="error" size={16} />}
            {message}
          </p>
        )}
      </div>
      <div className={styles.actions}>
        {!pending && (
          <Switch
            ref={switchRef}
            checked={t.isLive}
            onChange={onLiveChange}
            aria-label={`Visible to mentees: ${t.name}`}
            title={t.isLive ? 'Visible to mentees' : 'Hidden from mentees'}
          />
        )}
        {shareUrl && !pending && (
          <CopyLinkButton label={`Copy share link for ${t.name}`} url={shareUrl} />
        )}
        <RowMenu
          triggerRef={menuRef}
          label={`More actions for ${t.name}`}
          items={[
            { key: 'edit', icon: 'edit', label: 'Edit', onSelect: onEdit },
            { key: 'duplicate', icon: 'content_copy', label: 'Duplicate', onSelect: onDuplicate },
            ...(pending
              ? []
              : [
                  // Only a live type can be featured (product, 2026-09-30); hiding
                  // un-features it at once (useSetLive), so a hidden one has neither.
                  ...(t.isLive
                    ? [
                        {
                          key: 'feature',
                          icon: 'star' as const,
                          label: t.isFeatured ? 'Remove from featured' : 'Mark as featured',
                          onSelect: () => onFeature(!t.isFeatured),
                        },
                      ]
                    : []),
                  {
                    key: 'delete',
                    icon: 'delete' as const,
                    label: 'Delete',
                    onSelect: onDelete,
                    danger: true,
                  },
                ]),
          ]}
        />
      </div>
    </article>
  );
}

/** Design `pendingNote`: "Hidden. Deleted after its last booked session on Oct 14. The 2 booked sessions go ahead." */
export function pendingNote(p: { deletesAfter: string | null; bookedCount: number }): string {
  const n = p.bookedCount;
  const when = p.deletesAfter ? ` on ${formatShortDate(p.deletesAfter)}` : '';
  // No booked session left: it goes at the next hourly run.
  if (!n) return 'Hidden. Deleted within the hour.';
  return `Hidden. Deleted after its last booked session${when}. The ${n} booked session${n === 1 ? ' goes' : 's go'} ahead.`;
}
