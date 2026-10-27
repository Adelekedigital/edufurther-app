'use client';

import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonAnchor } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Tag } from '@/components/atoms/Tag/Tag';
import { SideDrawer } from '@/components/templates/SideDrawer/SideDrawer';
import type {
  AdminMentorDetail,
  AdminMentorRow,
  AdminNote,
  MentorTab,
} from '@/lib/api/data/adminMentors';
import { MENTOR_DRAWER as D, MENTOR_STATUS } from '@/lib/copy/adminMentors';
import { mailtoHref } from '@/lib/utils/mailto';
import { MentorDetail } from './MentorDetail';
import { MentorNotes } from './MentorNotes';
import styles from './MentorDrawer.module.css';

const STATUS_TONE = {
  applications: 'progress',
  approved: 'success',
  paused: 'warning',
  notApproved: 'pending',
} as const;

export type DrawerAction = 'approve' | 'decline' | 'pause' | 'resume';

type Props = {
  /** The row it was opened from: the header shows while the detail loads. */
  row: AdminMentorRow;
  tab: MentorTab;
  detail: AdminMentorDetail | undefined;
  detailStatus: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  notes: AdminNote[] | undefined;
  notesStatus: 'loading' | 'error' | 'ready';
  onRetryNotes: () => void;
  /** Absent for limited_access, who can't write notes. */
  onAddNote?: (body: string) => Promise<unknown>;
  /** Approve, Not approved, Pause, Resume: off for limited_access. */
  canDecide: boolean;
  onAction: (a: DrawerAction) => void;
  onClose: () => void;
  zone: string;
};

/**
 * The mentor drawer (Admin.dc.html mentorLayout=drawer): 560px from the right,
 * full screen on phones, with the actions for the mentor's status pinned at
 * the foot (PRD Drawer footer table).
 */
export function MentorDrawer(p: Props) {
  const { row, tab } = p;
  const email = (variant: 'secondary-outlined' | 'text') => (
    <ButtonAnchor
      key="email"
      variant={variant}
      size="medium"
      href={mailtoHref(row.email)}
      className={styles.footBtn}
    >
      {D.email(row.firstName)}
    </ButtonAnchor>
  );
  const act = (
    a: DrawerAction,
    label: string,
    variant: 'primary' | 'secondary-outlined' | 'text',
  ) => (
    <Button
      key={a}
      variant={variant}
      size="medium"
      onClick={() => p.onAction(a)}
      className={styles.footBtn}
    >
      {label}
    </Button>
  );
  const selfPaused = row.pausedBy === 'mentor';
  const actions =
    tab === 'applications'
      ? p.canDecide
        ? [act('approve', D.approve, 'primary'), act('decline', D.decline, 'text')]
        : []
      : tab === 'approved'
        ? [
            email('secondary-outlined'),
            ...(p.canDecide ? [act('pause', D.pause, 'secondary-outlined')] : []),
          ]
        : tab === 'paused'
          ? [
              ...(p.canDecide && !selfPaused ? [act('resume', D.resume, 'primary')] : []),
              email('secondary-outlined'),
            ]
          : [email('text')];

  return (
    <SideDrawer
      open
      title={row.name}
      width="lg"
      onClose={p.onClose}
      header={
        <div className={styles.header}>
          <Avatar size="lg" initials={row.initials} tone={row.cover} src={row.photoUrl} alt="" />
          <div className={styles.headText}>
            <h2 className={styles.name}>{row.name}</h2>
            <div className={styles.headMeta}>
              <Tag tone={STATUS_TONE[tab]}>{MENTOR_STATUS[tab]}</Tag>
              <span className={styles.headEmail}>{row.email}</span>
            </div>
          </div>
        </div>
      }
      footer={actions.length ? actions : undefined}
    >
      {p.detailStatus === 'loading' && (
        <div className={styles.loading} aria-busy="true">
          <span className="sr-only">{D.loading}</span>
          <Skeleton height="48px" />
          <Skeleton height="96px" />
          <Skeleton height="64px" />
        </div>
      )}
      {p.detailStatus === 'error' && (
        <div className={styles.failed} role="alert">
          <p className={styles.failedTitle}>{D.loadFailed}</p>
          <p className={styles.muted}>{D.loadFailedBody}</p>
          <Button variant="secondary-outlined" size="medium" onClick={p.onRetry}>
            {D.retry}
          </Button>
        </div>
      )}
      {p.detailStatus === 'ready' && p.detail && <MentorDetail mentor={p.detail} zone={p.zone} />}
      <MentorNotes
        notes={p.notes}
        status={p.notesStatus}
        onRetry={p.onRetryNotes}
        onAdd={p.onAddNote}
        zone={p.zone}
      />
    </SideDrawer>
  );
}
