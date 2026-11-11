'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button, ButtonAnchor } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Input } from '@/components/atoms/Input/Input';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { ConfirmActions, confirmClose } from '@/components/molecules/ConfirmActions/ConfirmActions';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SwitchRow } from '@/components/molecules/SwitchRow/SwitchRow';
import { CONSENT_COPY } from '@/lib/copy/consent';
import { SECURITY_COPY as C } from '@/lib/copy/settings';
import { supportHref } from '@/lib/utils/mailto';
import type { LoginProvider } from '@/types/settings';
import styles from './SecuritySettings.module.css';

/** What the delete confirm's frame shows; the page draws it (ModalShell): an organism can't import a template. */
export type DeleteShell = {
  title: string;
  icon: IconName;
  tone: 'danger';
  size: 'sm';
  /** A bottom sheet on phones (design `sheet`). */
  mobile: 'sheet';
  alert: true;
  /** The warning's id: the dialog's accessible description. */
  describedBy: string;
  onClose: () => void;
  closeDisabled: boolean;
};

export type SecuritySettingsProps = {
  /** Mentor copy is here for Mentor Settings; mentors don't reach this tab yet. */
  role: 'mentee' | 'mentor';
  /** Full name, for the support email. */
  name: string;
  email: string;
  verified: boolean;
  /** Null while it's being read: only "How you log in" waits. */
  provider: LoginProvider | null;
  /** Upcoming sessions deleting cancels (both sides). */
  upcomingCount: number;
  /** Requests awaiting an answer, sent or received, that deleting withdraws or declines. */
  requestCount: number;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void> | void;
  deleting: boolean;
  /** Why the delete failed, in our words; the confirm stays open. */
  deleteError: string | null;
  renderShell: (shell: DeleteShell, body: ReactNode) => ReactNode;
  /**
   * Notifications on this device (decision 312). Absent: nothing to offer
   * here (unsupported, push not set up, or a preview), so no card.
   */
  notifications?: DeviceNotifications;
  /**
   * Analytics cookies (PRD 30): the same answer the banner records, changed
   * here at any time, effective at once. Absent: not offered (flag off, or a
   * preview).
   */
  analytics?: { granted: boolean; busy: boolean; onChange: (granted: boolean) => void };
};

export type DeviceNotifications = {
  state: 'loading' | 'blocked' | 'on' | 'off';
  /** A change is on its way: the switch waits for it. */
  busy: boolean;
  /** Why the last change didn't happen, if it didn't. */
  failure: 'blocked' | 'failed' | null;
  onChange: (on: boolean) => void;
};

/**
 * Settings › Login and security (SecuritySettings.dc.html, auth=passwordless):
 * the email (changed through support) and how they log in, then Delete
 * account behind a danger confirm that needs DELETE typed. No password row:
 * sign-in is passwordless.
 */
export function SecuritySettings(p: SecuritySettingsProps) {
  const mentor = p.role === 'mentor';
  const dangerId = useId();
  return (
    <div className={styles.root}>
      <section className={styles.card}>
        <div className={styles.row}>
          <Tile icon="mail" />
          <div className={styles.text}>
            <span className={styles.label}>
              {C.email}
              {p.verified && (
                <Badge type="accent" color="green" size="sm">
                  {C.verified}
                </Badge>
              )}
            </span>
            <span className={styles.value}>{p.email}</span>
            <span className={styles.hint}>{C.emailHint}</span>
          </div>
          <ButtonAnchor
            variant="secondary-outlined"
            size="medium"
            href={supportHref(
              { name: p.name, email: p.email, mentor },
              { subject: C.supportSubject, body: C.supportBody },
            )}
          >
            {C.contactSupport}
          </ButtonAnchor>
        </div>
        <div className={`${styles.row} ${styles.divided}`}>
          <Tile icon="key" />
          <div className={styles.text}>
            <span className={styles.rowTitle}>{C.howYouLogIn}</span>
            {p.provider === null ? (
              <span className={styles.meta} aria-busy="true">
                <Skeleton width="60%" height="12px" />
              </span>
            ) : (
              <span className={styles.meta}>
                {p.provider === 'google' ? C.viaGoogle(p.email) : C.viaCode(p.email)}
              </span>
            )}
            {p.provider === 'google' && <span className={styles.metaSoft}>{C.alsoCode}</span>}
          </div>
        </div>
      </section>

      {p.notifications && <NotificationsCard {...p.notifications} />}

      {p.analytics && (
        <section className={styles.card} aria-label={CONSENT_COPY.settingsTitle}>
          <SwitchRow
            label={CONSENT_COPY.settingsTitle}
            labelAs="h2"
            hint={CONSENT_COPY.settingsHint}
            checked={p.analytics.granted}
            onChange={p.analytics.onChange}
            busy={p.analytics.busy}
            leading={<Tile icon="monitoring" />}
            classes={{
              row: styles.row,
              text: styles.text,
              label: styles.rowTitle,
              hint: styles.meta,
            }}
          />
        </section>
      )}

      <section className={styles.danger} aria-labelledby={dangerId}>
        <div className={styles.dangerText}>
          <h2 id={dangerId} className={styles.dangerTitle}>
            {C.deleteHeading}
          </h2>
          <span className={styles.meta}>
            {mentor ? (
              <>
                {C.deleteBodyMentor}{' '}
                <Link href="/calendar" prefetch={false} className={styles.link}>
                  {C.busyLink}
                </Link>{' '}
                {C.busyAfter}
              </>
            ) : (
              C.deleteBodyMentee
            )}
          </span>
        </div>
        <Button
          variant="destructive-outlined"
          size="medium"
          onClick={() => p.onDeleteOpenChange(true)}
        >
          {C.deleteButton}
        </Button>
      </section>

      {p.deleteOpen && <DeleteConfirm {...p} mentor={mentor} />}
    </div>
  );
}

/**
 * One switch for this device: a phone and a laptop are each turned on where
 * they are. Blocked in the browser or phone settings: no switch, as only those
 * settings can undo it, and the line says so.
 */
function NotificationsCard(n: DeviceNotifications) {
  const headingRef = useRef<HTMLElement>(null);
  const blocked = n.state === 'blocked' || n.failure === 'blocked';
  // Blocked from the switch itself: it goes, so focus moves to the card's
  // heading rather than falling to the page; the line below says why.
  const wasBlocked = useRef(blocked);
  useEffect(() => {
    if (blocked && !wasBlocked.current) {
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost) headingRef.current?.focus();
    }
    wasBlocked.current = blocked;
  }, [blocked]);
  return (
    <section className={styles.card} aria-label={C.notificationsTitle}>
      <SwitchRow
        label={C.notificationsTitle}
        labelAs="h2"
        labelRef={headingRef}
        labelFocusable
        hint={blocked ? C.notificationsBlocked : C.notificationsHint}
        hintLive
        checked={n.state === 'on'}
        onChange={n.onChange}
        busy={n.busy}
        loading={n.state === 'loading'}
        noSwitch={blocked}
        leading={<Tile icon="notifications" />}
        after={
          n.failure === 'failed' && (
            <span className={styles.failed} role="alert">
              {C.notificationsFailed}
            </span>
          )
        }
        classes={{ row: styles.row, text: styles.text, label: styles.rowTitle, hint: styles.meta }}
      />
    </section>
  );
}

function Tile({ icon }: { icon: IconName }) {
  return (
    <span className={styles.tile} aria-hidden>
      <Icon name={icon} size={20} />
    </span>
  );
}

/** Mounted only while open, so the typed word starts empty every time. */
function DeleteConfirm(p: SecuritySettingsProps & { mentor: boolean }) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const warnId = useId();
  // Trimmed, exact case: "delete" doesn't count.
  const ready = typed.trim() === C.confirmWord;
  const confirm = () => {
    if (ready && !p.deleting) void p.onDelete();
  };
  const close = confirmClose(p.deleting, () => p.onDeleteOpenChange(false));
  return p.renderShell(
    {
      title: C.modalTitle,
      icon: 'warning',
      tone: 'danger',
      size: 'sm',
      mobile: 'sheet',
      alert: true,
      describedBy: warnId,
      ...close,
    },
    <>
      <Notice id={warnId} tone="danger" showIcon={false} live={false}>
        <span className={styles.warn}>
          {C.deleteWarn(p.mentor, p.upcomingCount, p.requestCount)}
        </span>
      </Notice>
      <label className={styles.confirmField} htmlFor={inputId}>
        {C.typeToConfirm}
        <Input
          id={inputId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          // Not `disabled`: Enter here starts the delete, and a disabled
          // field drops focus to the page. Read-only keeps it in the dialog.
          readOnly={p.deleting}
          aria-disabled={p.deleting || undefined}
        />
      </label>
      <ConfirmActions
        keepLabel={C.keep}
        confirmLabel={C.confirm}
        pendingLabel={C.deleting}
        pending={p.deleting}
        error={p.deleteError}
        confirmDisabled={!ready}
        onKeep={() => p.onDeleteOpenChange(false)}
        onConfirm={confirm}
      />
    </>,
  );
}
