'use client';

import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button, ButtonAnchor } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Input } from '@/components/atoms/Input/Input';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { ConfirmActions, confirmClose } from '@/components/molecules/ConfirmActions/ConfirmActions';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SECURITY_COPY as C, SUPPORT_EMAIL } from '@/lib/copy/settings';
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
};

/** The design's request to support: subject and body prefilled (SecuritySettings.dc.html). */
export function supportHref(p: { name: string; email: string; mentor: boolean }) {
  const name = p.name.trim() || p.email;
  const firstName = name.split(/\s+/)[0] ?? name;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(C.supportSubject(name))}&body=${encodeURIComponent(
    C.supportBody({ name, firstName, email: p.email, mentor: p.mentor }),
  )}`;
}

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
            href={supportHref({ name: p.name, email: p.email, mentor })}
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
