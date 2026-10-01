import Link from 'next/link';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tag } from '@/components/atoms/Tag/Tag';
import { SessionTypeOwnerFooter } from '@/components/molecules/SessionTypeOwnerFooter/SessionTypeOwnerFooter';
import type { ProfileSessionType } from '@/types/mentor';
import styles from './SessionTypeList.module.css';

/** The owner's controls on their active types (product 2026-09-30: active only). */
export type SessionTypeOwnerActions = {
  cards: ProfileSessionType[];
  /** The switch only hides: every card shown is visible. */
  onHide: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** Where "New session type" goes. */
  newHref: string;
};

type PublicProps = {
  sessionTypes: ProfileSessionType[];
  onBook: (sessionTypeId: string) => void;
  /** Why booking can't start (offline, account not ready), or null. */
  bookBlocked: string | null;
  /** The owner sees their offerings without Book buttons. */
  canBook: boolean;
  /** Drawn, but can't be used (the owner's "View as mentee"). */
  bookDisabled?: boolean;
  owner?: undefined;
};
/** The owner's own view (Mentor Profile.dc.html `canEdit`). */
type OwnerProps = { owner: SessionTypeOwnerActions };
type SessionTypeListProps = PublicProps | OwnerProps;

/**
 * The Sessions tab (Mentor Profile.dc.html): one card per offering. The
 * design's per-offering "Free Mon, Sep 28" line is not shown: availability is
 * stored per mentor, not per offering (backend reply #10).
 */
export function SessionTypeList(p: SessionTypeListProps) {
  const owner = p.owner;
  const cards = owner ? owner.cards : p.sessionTypes;
  return (
    <ul className={styles.grid}>
      {cards.map((s) => (
        <li key={s.id} className={styles.card} data-session-type-id={s.id}>
          <div className={styles.top}>
            {s.category ? <Tag tone="info">{s.category}</Tag> : <span />}
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
              onHide={() => owner.onHide(s.id)}
              onEdit={() => owner.onEdit(s.id)}
              onDelete={() => owner.onDelete(s.id)}
            />
          ) : (
            !p.owner &&
            p.canBook && (
              <div className={styles.foot}>
                {/* Repeated on every card, so outlined (CTA hierarchy). */}
                <Button
                  variant="secondary-outlined"
                  disabled={!!p.bookBlocked || !!p.bookDisabled}
                  onClick={() => p.onBook(s.id)}
                >
                  {p.bookBlocked ?? 'Book session'}
                </Button>
              </div>
            )
          )}
        </li>
      ))}
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
