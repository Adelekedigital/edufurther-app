'use client';

import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { BookingPreferencesForm } from '@/components/organisms/SessionTypeWizard/BookingPreferencesForm';
import { WeeklyHoursForm } from '@/components/organisms/SessionTypeWizard/WeeklyHoursForm';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import type { Created, MentorDefaults } from '@/lib/api/data/sessionTypes';
import type { useWeeklyHours } from '@/lib/api/data/weeklyHours';
import type { DayHours } from '@/lib/utils/sessionTypeDraft';
import styles from './SessionTypesScreen.module.css';

type Buttons = { keep: string; confirm: string; onKeep: () => void; onConfirm: () => void };

/** A destructive confirm (project rule: a danger modal). */
export function DangerConfirm(p: { title: string; subtitle: string } & Buttons) {
  return (
    <ModalShell
      title={p.title}
      subtitle={p.subtitle}
      icon="delete"
      tone="danger"
      size="sm"
      onClose={p.onKeep}
    >
      <div className={styles.buttons}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={p.onKeep}>
          {p.keep}
        </Button>
        <Button size="large" variant="destructive" fullWidth onClick={p.onConfirm}>
          {p.confirm}
        </Button>
      </div>
    </ModalShell>
  );
}

export function DefaultsModal(p: {
  defaults: MentorDefaults;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (next: MentorDefaults) => void;
}) {
  return (
    <ModalShell
      title="Booking preferences"
      subtitle="Used by every session type set to “Use my defaults”. Changes apply right away."
      icon="tune"
      size="md"
      onClose={p.onClose}
    >
      <BookingPreferencesForm
        initial={p.defaults}
        saving={p.saving}
        error={p.error}
        onCancel={p.onClose}
        onSave={p.onSave}
      />
    </ModalShell>
  );
}

export function WeeklyModal(p: {
  weekly: NonNullable<ReturnType<typeof useWeeklyHours>['data']>;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (days: DayHours[]) => void;
}) {
  return (
    <ModalShell
      title="Your weekly hours"
      subtitle="Shared by every session type set to “Use my Calendar availability”. Changes apply right away."
      icon="calendar_month"
      size="lg"
      onClose={p.onClose}
    >
      <WeeklyHoursForm
        initial={p.weekly.days}
        timeZone={p.weekly.timeZone}
        otherZones={p.weekly.otherZones}
        otherSlots={p.weekly.otherSlots}
        saving={p.saving}
        error={p.error}
        onCancel={p.onClose}
        onSave={p.onSave}
      />
    </ModalShell>
  );
}

/** Session Types.dc.html `wasEdit`: "Changes saved". */
export function SavedModal(p: {
  name: string;
  live: boolean;
  profileHref: string | null;
  onDone: () => void;
}) {
  return (
    <ModalShell
      title="Changes saved"
      subtitle={
        p.live
          ? `“${p.name}” is live on your profile. Mentees can book it in your open hours.`
          : // Copy confirmed by design (reply 2026-09-29, #8) (a hidden type isn't live).
            `“${p.name}” is saved. It’s hidden, so mentees can’t book it until you switch it on.`
      }
      icon="check_circle"
      tone="success"
      size="sm"
      onClose={p.onDone}
    >
      <div className={styles.buttons}>
        {p.live && p.profileHref && (
          <ButtonLink
            href={p.profileHref}
            prefetch={false}
            size="large"
            variant="secondary-outlined"
            fullWidth
          >
            View on profile
          </ButtonLink>
        )}
        <Button size="large" fullWidth onClick={p.onDone}>
          Done
        </Button>
      </div>
    </ModalShell>
  );
}

export function PublishedModal(p: {
  name: string;
  created: Created;
  profileHref: string;
  retrying: boolean;
  onRetry: () => void;
  onDone: () => void;
}) {
  const failed = p.created.failedWindows.length > 0;
  return (
    <ModalShell
      title="Session type published"
      subtitle={
        failed
          ? // Copy confirmed by design (reply 2026-09-29, #5).
            `“${p.name}” is live on your profile, but its dedicated hours didn’t save. Until they do, mentees book it in your Calendar hours.`
          : `“${p.name}” is live on your profile. Mentees can book it in your open hours.`
      }
      icon="check_circle"
      tone="success"
      size="sm"
      onClose={p.onDone}
    >
      <div className={styles.buttons}>
        {failed ? (
          <Button
            size="large"
            variant="secondary-outlined"
            fullWidth
            busy={p.retrying}
            onClick={p.onRetry}
          >
            Retry hours
          </Button>
        ) : (
          <ButtonLink
            href={p.profileHref}
            prefetch={false}
            size="large"
            variant="secondary-outlined"
            fullWidth
          >
            View on profile
          </ButtonLink>
        )}
        <Button size="large" fullWidth onClick={p.onDone}>
          Done
        </Button>
      </div>
    </ModalShell>
  );
}
