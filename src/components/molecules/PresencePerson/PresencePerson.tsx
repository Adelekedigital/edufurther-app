import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { cx } from '@/lib/utils/cx';
import type { BookingParty } from '@/types/booking';
import styles from './PresencePerson.module.css';

type PresencePersonProps = {
  person: BookingParty;
  /** "You" or their first name. */
  name: string;
  /** "Here now", "Not in the call yet", "Joined", "Didn't join". */
  presence: string;
  /**
   * `here`: in the call right now (green ring with the design's pulse; live
   * presence, backend #394). `joined`: has been in the call (green ring, no
   * pulse: the design's completed ring). `absent`: recorded as not joining (red
   * ring). `away`: grey.
   */
  tone: 'here' | 'joined' | 'absent' | 'away';
};

/** Session Join.dc.html: one person in the lobby, with whether they're in the call. */
export function PresencePerson({ person, name, presence, tone }: PresencePersonProps) {
  return (
    <div
      className={cx(
        styles.person,
        styles[tone],
        (tone === 'joined' || tone === 'here') && styles.green,
      )}
    >
      <span className={styles.ring}>
        {tone === 'here' && <span aria-hidden className={styles.pulse} />}
        <Avatar
          size="2xl"
          initials={person.initials}
          tone={person.deleted ? 'plain' : person.cover}
          src={person.avatarUrl}
          focus={person.avatarFocus}
          alt=""
        />
      </span>
      <span className={styles.name}>{name}</span>
      <span className={styles.presence}>
        <span aria-hidden className={styles.dot} />
        {presence}
      </span>
    </div>
  );
}
