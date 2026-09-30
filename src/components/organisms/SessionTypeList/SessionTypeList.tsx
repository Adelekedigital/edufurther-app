import Link from 'next/link';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tag } from '@/components/atoms/Tag/Tag';
import { SessionTypeOwnerFooter } from '@/components/molecules/SessionTypeOwnerFooter/SessionTypeOwnerFooter';
import type { OwnerSessionCard, ProfileSessionType } from '@/types/mentor';
import styles from './SessionTypeList.module.css';

/** The owner's controls; with it, the list shows every card they own. */
export type SessionTypeOwnerActions = {
  cards: OwnerSessionCard[];
  onToggle: (id: string, visible: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onKeep: (id: string) => void;
  /** Where "New session type" goes. */
  newHref: string;
};

type SessionTypeListProps = {
  sessionTypes: ProfileSessionType[];
  onBook: (sessionTypeId: string) => void;
  /** Why booking can't start (offline, account not ready), or null. */
  bookBlocked: string | null;
  /** The owner sees their offerings without Book buttons. */
  canBook: boolean;
  /** The owner's own view (Mentor Profile.dc.html `canEdit`); replaces `sessionTypes`. */
  owner?: SessionTypeOwnerActions;
};

/**
 * The Sessions tab (Mentor Profile.dc.html): one card per offering. The
 * design's per-offering "Free Mon, Sep 28" line is not shown: availability is
 * stored per mentor, not per offering (backend reply #10).
 */
export function SessionTypeList({
  sessionTypes,
  onBook,
  bookBlocked,
  canBook,
  owner,
}: SessionTypeListProps) {
  const cards: (ProfileSessionType & Partial<OwnerSessionCard>)[] = owner
    ? owner.cards
    : sessionTypes;
  return (
    <ul className={styles.grid}>
      {cards.map((s) => {
        const dim = !!owner && (!s.visible || !!s.pendingNote);
        return (
          <li key={s.id} className={`${styles.card} ${dim ? styles.dim : ''}`}>
            <div className={styles.top}>
              <span className={styles.tags}>
                {s.category && <Tag tone="info">{s.category}</Tag>}
                {dim && (
                  <Badge type="accent" color={s.pendingNote ? 'red' : 'neutral'} size="sm">
                    {s.pendingNote ? 'Scheduled for deletion' : 'Hidden'}
                  </Badge>
                )}
              </span>
              <span className={styles.price}>Free</span>
            </div>
            <h3 className={styles.name}>{s.name}</h3>
            {s.description && <p className={styles.desc}>{s.description}</p>}
            <div className={styles.chips}>
              <span className={styles.chip}>
                <Icon name="schedule" size={14} />
                {s.durationMin} min
              </span>
              {s.stage && (
                <span className={styles.chip}>
                  <Icon name="flag" size={14} />
                  {s.stage}
                </span>
              )}
            </div>
            {owner ? (
              <SessionTypeOwnerFooter
                name={s.name}
                visible={!!s.visible}
                onToggle={(v) => owner.onToggle(s.id, v)}
                onEdit={() => owner.onEdit(s.id)}
                onDelete={() => owner.onDelete(s.id)}
                pending={
                  s.pendingNote
                    ? {
                        note: s.pendingNote,
                        keeping: !!s.keeping,
                        onKeep: () => owner.onKeep(s.id),
                      }
                    : null
                }
              />
            ) : (
              canBook && (
                <div className={styles.foot}>
                  {/* Repeated on every card, so outlined (CTA hierarchy). */}
                  <Button
                    variant="secondary-outlined"
                    disabled={!!bookBlocked}
                    onClick={() => onBook(s.id)}
                  >
                    {bookBlocked ?? 'Book session'}
                  </Button>
                </div>
              )
            )}
          </li>
        );
      })}
      {owner && (
        <li className={styles.newItem}>
          <Link href={owner.newHref} className={styles.newTile}>
            <Icon name="add" size={24} className={styles.newIcon} />
            <span className={styles.newTitle}>New session type</span>
            <span className={styles.newHint}>
              Opens Session types, where you set questions and booking rules.
            </span>
          </Link>
        </li>
      )}
    </ul>
  );
}
