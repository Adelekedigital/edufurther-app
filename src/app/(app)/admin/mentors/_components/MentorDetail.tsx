import { Tag } from '@/components/atoms/Tag/Tag';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
import { Icon } from '@/components/atoms/Icon/Icon';
import type {
  AdminBooking,
  AdminEducation,
  AdminMentorDetail,
  BookingOutcome,
} from '@/lib/api/data/adminMentors';
import { outcomeTag } from '@/lib/utils/bookings';
import type { BookingParty } from '@/types/booking';
import { MENTOR_DRAWER as D, MENTOR_TABLE } from '@/lib/copy/adminMentors';
import { cx } from '@/lib/utils/cx';
import { educationTitle } from '@/lib/utils/educationLine';
import { formatShortDate } from '@/lib/utils/format';
import { zoneLabel } from '@/lib/utils/timezones';
import { tierWord, waitLine } from './mentorLines';
import { tierTone } from './mentorList';
import styles from './MentorDrawer.module.css';

type TagTone = Parameters<typeof Tag>[0]['tone'];

/**
 * A booking's pill (Admin.dc.html `bks`). Canceled and missed by the mentee
 * take the Bookings words and tones (`outcomeTag`, PRD Q4), read from the
 * mentor's side. A Record, so a new outcome fails to compile until it's named.
 */
const OUTCOME: Record<BookingOutcome, (b: AdminBooking) => { label: string; tone: TagTone }> = {
  upcoming: () => ({ label: D.bookings.upcoming, tone: 'progress' }),
  awaiting_outcome: () => ({ label: D.bookings.awaiting, tone: 'pending' }),
  completed: () => ({ label: D.bookings.completed, tone: 'success' }),
  missed_by_mentor: () => ({ label: D.bookings.missedByMentor, tone: 'danger' }),
  missed_by_mentee: (b) => bookingsTag(b, 'noShow'),
  canceled: (b) => bookingsTag(b, 'cancelled'),
};

function bookingsTag(b: AdminBooking, status: 'noShow' | 'cancelled') {
  const tag = outcomeTag({
    status,
    side: 'mentor',
    cancelledBy: null,
    myAttendance: 'attended',
    other: {
      firstName: b.menteeFirstName,
      attendance: 'noShow',
      deleted: !b.menteeFirstName,
    } as BookingParty,
    respondBy: null,
    startsAt: b.startsAt,
  });
  return { label: tag?.label ?? '', tone: (tag?.tone ?? 'pending') as TagTone };
}

const profileHref = (m: AdminMentorDetail) => `/mentors/${encodeURIComponent(m.handle ?? m.id)}`;

/** A fact's value: plain text (coloured by `tone`), or a new-tab link. */
type FactRow = { label: string; text: string; href?: string; tone?: string | null };

function facts(m: AdminMentorDetail, zone: string): FactRow[] {
  const d = (iso: string | null) => (iso ? formatShortDate(iso, zone) : '');
  const tz = { label: D.facts.timeZone, text: m.timeZone ? zoneLabel(m.timeZone) : '' };
  const profile = { label: D.facts.profile, text: D.facts.viewAsMentee, href: profileHref(m) };
  const linkedin = m.linkedinUrl
    ? [{ label: D.facts.linkedin, text: D.facts.viewLinkedin, href: m.linkedinUrl }]
    : [];
  if (m.status === 'applications') {
    const wait = m.waitingDays ?? 0;
    return [
      {
        label: D.facts.applied,
        text: m.submittedAt ? D.appliedWaiting(d(m.submittedAt), wait) : '',
        tone: waitLine(wait).tone,
      },
      ...linkedin,
      profile,
      tz,
    ];
  }
  if (m.status === 'notApproved')
    return [{ label: D.facts.applied, text: d(m.submittedAt) }, ...linkedin, profile, tz];
  return [{ label: D.facts.approved, text: d(m.approvedAt) }, tz, profile];
}

const years = (e: AdminEducation) =>
  e.start && e.current
    ? `${e.start} – ${D.education.now}`
    : e.start && e.end && e.start !== e.end
      ? `${e.start} – ${e.end}`
      : (e.end ?? e.start ?? '');

/** The drawer's body for one mentor, by status (PRD Drawer). */
export function MentorDetail({ mentor: m, zone }: { mentor: AdminMentorDetail; zone: string }) {
  const d = (iso: string | null) => (iso ? formatShortDate(iso, zone) : '');
  const live = m.status === 'approved' || m.status === 'paused';
  const showHours =
    (m.status === 'applications' || m.status === 'notApproved') && m.hours.length > 0;
  return (
    <>
      <dl className={styles.facts}>
        {facts(m, zone)
          .filter((f) => f.text)
          .map((f) => (
            <div key={f.label} className={styles.fact}>
              <dt>{f.label}</dt>
              <dd>
                {f.href ? (
                  <ExternalLink href={f.href} label={f.text} className={styles.link}>
                    {f.text}
                    <Icon name="open_in_new" size={16} />
                  </ExternalLink>
                ) : (
                  <span className={cx(f.tone && styles[f.tone])}>{f.text}</span>
                )}
              </dd>
            </div>
          ))}
      </dl>

      {m.status === 'paused' && m.paused && (
        <div className={cx(styles.callout, styles.amber)}>
          <span className={styles.calloutTitle}>
            {m.paused.at ? D.paused.title(d(m.paused.at)) : D.paused.titleUndated}
          </span>
          <div className={styles.line}>
            <span>{D.paused.reason}</span>
            <p>
              {m.paused.by === 'mentor' ? MENTOR_TABLE.pausedByMentor : (m.paused.reason ?? '')}
            </p>
          </div>
          <div className={styles.line}>
            <span>{D.paused.meaning}</span>
            <p>{D.paused.meaningBody}</p>
          </div>
        </div>
      )}
      {m.status === 'notApproved' && m.declined && (
        <div className={cx(styles.callout, styles.grey)}>
          <span className={styles.calloutTitle}>
            {m.declined.at ? D.declined.title(d(m.declined.at)) : D.declined.titleUndated}
          </span>
          <div className={styles.line}>
            <span>{D.declined.comment(m.firstName)}</span>
            <p>{m.declined.reason ?? ''}</p>
          </div>
        </div>
      )}

      {live && (
        <>
          <div className={styles.stats}>
            {(
              [
                [D.stats.completed, String(m.stats.completed)],
                [D.stats.upcoming, String(m.stats.upcoming)],
                [D.stats.missed, String(m.stats.missedByMentor)],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className={styles.stat}>
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue}>{v}</span>
              </div>
            ))}
            <div className={styles.stat}>
              <span className={styles.statLabel}>{D.stats.showUp}</span>
              <span className={styles.statValue}>
                {m.stats.showUpRate == null ? D.stats.none : `${m.stats.showUpRate}%`}
              </span>
              <Tag tone={tierTone(m.stats.showUpTier)} className={styles.statPill}>
                {tierWord(m.stats.showUpTier)}
              </Tag>
            </div>
          </div>
          <section className={styles.section}>
            <h3>{D.bookings.title}</h3>
            {m.recentBookings.length ? (
              <ul className={styles.box}>
                {m.recentBookings.map((b) => {
                  const pill = OUTCOME[b.outcome](b);
                  return (
                    <li key={b.id} className={styles.booking}>
                      <span className={styles.mentee}>{b.mentee}</span>
                      <span className={styles.when}>{d(b.startsAt)}</span>
                      {pill.label && <Tag tone={pill.tone}>{pill.label}</Tag>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.muted}>{D.bookings.none}</p>
            )}
          </section>
        </>
      )}

      <section className={styles.section}>
        <h3>{D.about.title}</h3>
        {m.headline && <p className={styles.headline}>{m.headline}</p>}
        <p className={styles.about}>{m.about ?? D.about.notAdded}</p>
      </section>

      <section className={styles.section}>
        <h3>{D.education.title}</h3>
        <ul className={styles.box}>
          {(m.education.length ? m.education : [null]).map((e, i) => (
            <li key={e?.id ?? i} className={styles.degree}>
              <div className={styles.degreeMain}>
                <span className={styles.degreeTitle}>
                  {e ? educationTitle(e) : D.about.notAdded}
                </span>
                <span className={styles.small}>
                  {(e && [e.school, e.country].filter(Boolean).join(' · ')) || D.education.noSchool}
                </span>
              </div>
              {e && <span className={styles.small}>{years(e)}</span>}
            </li>
          ))}
        </ul>
      </section>

      {m.helpAreas.length > 0 && (
        <section className={styles.section}>
          <h3>{D.help}</h3>
          <ul className={styles.chips}>
            {m.helpAreas.map((h) => (
              <Tag key={h} tone="area" as="li">
                {h}
              </Tag>
            ))}
          </ul>
        </section>
      )}

      {showHours && (
        <section className={cx(styles.section, styles.hours)}>
          <h3>{D.hours.title}</h3>
          {m.hours.map((h) => (
            <span key={h} className={styles.hourLine}>
              {h}
            </span>
          ))}
          {/* Q5: the zone only; "They confirm these after approval." dropped. */}
          {m.hoursZone && <span className={styles.small}>{`${zoneLabel(m.hoursZone)}.`}</span>}
        </section>
      )}
    </>
  );
}
