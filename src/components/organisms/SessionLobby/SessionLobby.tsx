import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { AddToCalendarMenu } from '@/components/molecules/AddToCalendarMenu/AddToCalendarMenu';
import { PresencePerson } from '@/components/molecules/PresencePerson/PresencePerson';
import { SessionClock } from '@/components/molecules/SessionClock/SessionClock';
import {
  SessionStatusPill,
  type SessionStatusTone,
} from '@/components/molecules/SessionStatusPill/SessionStatusPill';
import type { CalendarEvent } from '@/lib/utils/calendarLinks';
import { cx } from '@/lib/utils/cx';
import type { BookingParty } from '@/types/booking';
import styles from './SessionLobby.module.css';

export type LobbyPerson = {
  person: BookingParty;
  name: string;
  presence: string;
  tone: 'joined' | 'absent' | 'away';
};

export type LobbyLink = {
  key: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type SessionLobbyProps = {
  /**
   * The hero's ground: white before the door opens, blue once it has, green
   * while running and once completed; for a missed session, the outcome's own.
   */
  ground: 'white' | 'blue' | 'green' | 'red' | 'grey';
  status: { tone: SessionStatusTone; label: string; live?: boolean };
  /** "1:1 call with Gbenga Ogundipe". */
  title: string;
  /** "Mon, Sep 28 · 6:00 – 6:30 pm · Lagos (WAT) · EduFurther video". */
  meta: string;
  clock: { label: string; value: string; sub: string } | null;
  people: [LobbyPerson, LobbyPerson];
  /** The Join button and the line under it. Absent once nobody can join. */
  join?: {
    label: string;
    enabled: boolean;
    busy?: boolean;
    /** Absent while locked: there is nothing to do yet. */
    onJoin?: () => void;
    hint: string;
  };
  /** In place of Join when the session has moved past it (window closed, ended). */
  note?: string;
  links?: LobbyLink[];
  /** "Add to calendar", first in the links row (before the call only). */
  calendar?: CalendarEvent;
  /** A problem with the last Join press, under the button. */
  notice?: ReactNode;
};

/** Session Join.dc.html `layout=lobby`: the hero with the clock, both people and Join. */
export function SessionLobby({
  ground,
  status,
  title,
  meta,
  clock,
  people,
  join,
  note,
  links,
  calendar,
  notice,
}: SessionLobbyProps) {
  // Join can vanish under someone's focus (the window shuts, or the session
  // ends and settles, on a clock tick). Removing a focused element sends focus
  // to <body>, so it moves to the note that replaces Join, or to the title
  // when nothing replaces it (a settled session shows its outcome instead).
  const joinHadFocus = useRef(false);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasJoin = !!join;
  useEffect(() => {
    if (!hasJoin && joinHadFocus.current) {
      joinHadFocus.current = false;
      (noteRef.current ?? titleRef.current)?.focus();
    }
  }, [hasJoin]);

  return (
    <div className={cx(styles.lobby, styles[ground])}>
      <div className={styles.head}>
        <SessionStatusPill {...status} />
        <h1 ref={titleRef} tabIndex={-1} className={styles.title}>
          {title}
        </h1>
        <span className={styles.meta}>{meta}</span>
      </div>

      {clock && <SessionClock {...clock} />}

      <div className={styles.people}>
        {people.map((p) => (
          <PresencePerson key={p.person.id} {...p} />
        ))}
      </div>

      {join && (
        <div
          className={styles.join}
          onFocus={() => (joinHadFocus.current = true)}
          onBlur={() => (joinHadFocus.current = false)}
        >
          <Button
            size="large"
            fullWidth
            disabled={!join.enabled}
            busy={join.busy}
            onClick={join.onJoin}
          >
            {join.label}
          </Button>
          <span className={styles.hint}>{join.hint}</span>
        </div>
      )}
      {note && (
        <p ref={noteRef} tabIndex={-1} className={styles.note}>
          {note}
        </p>
      )}
      {notice && <div className={styles.notice}>{notice}</div>}

      {(!!links?.length || calendar) && (
        <div className={styles.links}>
          {calendar && <AddToCalendarMenu event={calendar} onTint={ground !== 'white'} />}
          {links?.map((l) => (
            <button
              key={l.key}
              type="button"
              className={cx(styles.link, l.danger && styles.danger)}
              onClick={l.onClick}
            >
              <Icon name={l.icon} size={16} />
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
