'use client';

import { useEffect, useRef, type CSSProperties, type Ref } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Tag } from '@/components/atoms/Tag/Tag';
import type { AdminMentorRow, MentorTab } from '@/lib/api/data/adminMentors';
import { MENTOR_STATUS, MENTOR_TAB_LABELS, MENTOR_TABLE as T } from '@/lib/copy/adminMentors';
import { cx } from '@/lib/utils/cx';
import { formatShortDate } from '@/lib/utils/format';
import { tierLine, waitLine } from './mentorLines';
import { tierTone, waitTone } from './mentorList';
import styles from './MentorTable.module.css';

type Cell = { text: string; sub?: string; tag?: Parameters<typeof Tag>[0]['tone']; tone?: Tone };
type Tone = 'danger' | 'warning' | 'success' | 'pending' | null;

/** The three columns by tab (Admin.dc.html `cellsFor`; the Type column is later). */
function cellsFor(tab: MentorTab, m: AdminMentorRow, zone: string): Cell[] {
  const d = (iso: string | null) => (iso ? formatShortDate(iso, zone) : '');
  if (tab === 'applications') {
    const wait = m.waitingDays ?? 0;
    return [
      {
        text: T.waiting(wait),
        sub: m.submittedAt ? T.applied(d(m.submittedAt)) : undefined,
        tone: waitTone(wait),
      },
      { text: m.school?.name ?? T.notAdded, sub: m.school?.country ?? undefined },
    ];
  }
  if (tab === 'approved') {
    return [
      { text: d(m.approvedAt) },
      { text: T.completed(m.completed), sub: T.upcoming(m.upcoming) },
      { text: tierLine(m.showUpRate, m.showUpTier), tag: tierTone(m.showUpTier) },
    ];
  }
  if (tab === 'paused') {
    return [
      { text: T.paused, tag: 'warning' },
      { text: d(m.pausedAt) },
      { text: m.pausedBy === 'mentor' ? T.pausedByMentor : (m.pausedReason ?? '') },
    ];
  }
  return [{ text: d(m.decidedAt) }, { text: m.declineReason ?? '' }, { text: d(m.submittedAt) }];
}

/** The phone row's one meta line (Admin.dc.html `metaFor`), coloured like its cell. */
function metaFor(tab: MentorTab, m: AdminMentorRow, zone: string): { text: string; tone: Tone } {
  if (tab === 'applications') return waitLine(m.waitingDays ?? 0);
  if (tab === 'approved')
    return {
      text: `${tierLine(m.showUpRate, m.showUpTier)} · ${T.sessions(m.completed)}`,
      tone: tierTone(m.showUpTier),
    };
  const date = tab === 'paused' ? m.pausedAt : m.decidedAt;
  return {
    text: [MENTOR_STATUS[tab], date && formatShortDate(date, zone)].filter(Boolean).join(' · '),
    tone: null,
  };
}

/** Desktop columns (Admin.dc.html `grid`): Applications has two, so one track fewer. */
const COLUMNS: Record<MentorTab, string> = {
  applications: 'minmax(0,2fr) minmax(0,1.1fr) minmax(0,1.5fr) 24px',
  approved: 'minmax(0,2fr) minmax(0,1.1fr) minmax(0,1.5fr) minmax(0,1.2fr) 24px',
  paused: 'minmax(0,2fr) minmax(0,1.1fr) minmax(0,1.5fr) minmax(0,1.2fr) 24px',
  notApproved: 'minmax(0,2fr) minmax(0,1.1fr) minmax(0,1.5fr) minmax(0,1.2fr) 24px',
};

type Props = {
  tab: MentorTab;
  rows: AdminMentorRow[];
  zone: string;
  openId: string | null;
  onOpen: (id: string) => void;
  /** Applications, for admins who may decide: checkboxes and select-all. */
  selectable: boolean;
  checked: readonly string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  /** Each row's open button, so focus can come back to it. */
  rowRef: (id: string) => Ref<HTMLButtonElement>;
};

/**
 * The mentors table (Admin.dc.html drawer layout): a white card with a grey
 * header row, a 64px row per mentor that opens the drawer. Table semantics
 * on a CSS grid. The row's name is a real button stretched over the row, so
 * the checkbox beside it isn't nested in another control. Phones keep the
 * name, email and one meta line.
 */
export function MentorTable({
  tab,
  rows,
  zone,
  openId,
  onOpen,
  selectable,
  checked,
  onToggle,
  onToggleAll,
  rowRef,
}: Props) {
  const heads = T.heads[tab];
  const style = {
    '--cols': (selectable ? 'var(--touch-target-min) ' : '') + COLUMNS[tab],
  } as CSSProperties;
  const picked = rows.filter((r) => checked.includes(r.id)).length;
  const all = rows.length > 0 && picked === rows.length;
  const allRef = useRef<HTMLInputElement>(null);
  // Some but not all: the header box says so (only settable from script).
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = picked > 0 && !all;
  }, [picked, all]);
  return (
    <div
      role="table"
      aria-label={MENTOR_TAB_LABELS[tab]}
      className={cx(styles.card, selectable && styles.selectable)}
      style={style}
    >
      <div role="rowgroup">
        <div role="row" className={styles.head}>
          {selectable && (
            <span role="columnheader" className={styles.headCheck}>
              <label className={styles.check}>
                <input
                  ref={allRef}
                  type="checkbox"
                  checked={all}
                  onChange={onToggleAll}
                  aria-label={T.selectAll}
                />
              </label>
            </span>
          )}
          <span role="columnheader">{T.mentor}</span>
          {heads.map((h) => (
            <span key={h} role="columnheader" className={styles.colHead}>
              {h}
            </span>
          ))}
          <span aria-hidden />
        </div>
      </div>
      <div role="rowgroup">
        {rows.map((m) => {
          const on = m.id === openId;
          const isChecked = checked.includes(m.id);
          const meta = metaFor(tab, m, zone);
          return (
            <div
              key={m.id}
              role="row"
              className={cx(styles.row, on && styles.open, isChecked && !on && styles.checked)}
            >
              {selectable && (
                <span role="cell">
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(m.id)}
                      aria-label={T.select(m.name)}
                    />
                  </label>
                </span>
              )}
              <div role="cell" className={styles.who}>
                <Avatar size="sm" initials={m.initials} tone={m.cover} src={m.photoUrl} alt="" />
                <div className={styles.names}>
                  <button
                    ref={rowRef(m.id)}
                    type="button"
                    className={styles.opener}
                    aria-label={T.open(m.name)}
                    aria-expanded={on}
                    onClick={() => onOpen(m.id)}
                  >
                    {m.name}
                  </button>
                  <span className={styles.email}>{m.email}</span>
                  <span className={cx(styles.meta, meta.tone && styles[meta.tone])}>
                    {meta.text}
                  </span>
                </div>
              </div>
              {cellsFor(tab, m, zone).map((c, i) => (
                <div key={i} role="cell" className={styles.cell}>
                  {c.tag ? (
                    <Tag tone={c.tag} className={styles.pill}>
                      {c.text}
                    </Tag>
                  ) : (
                    <span className={cx(styles.text, c.tone && styles[c.tone])}>{c.text}</span>
                  )}
                  {c.sub && <span className={styles.sub}>{c.sub}</span>}
                </div>
              ))}
              <span aria-hidden className={styles.chevron}>
                <Icon name="chevron_right" size={20} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Loading: the table card with 5 skeleton rows (Admin.dc.html `listLoading`).
 * Not a status region: it mounts already holding its words, which a screen
 * reader may skip; they are read in place instead.
 */
export function MentorTableSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.card} aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={styles.skelRow}>
          <Skeleton width="32px" height="32px" radius="full" />
          <span className={styles.skelText}>
            <Skeleton width="40%" height="12px" />
            <Skeleton width="24%" height="10px" />
          </span>
        </div>
      ))}
    </div>
  );
}
