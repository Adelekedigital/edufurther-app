'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SaveBar } from '@/components/molecules/SaveBar/SaveBar';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import {
  BookingSettings,
  type BookingSettingsValue,
} from '@/components/organisms/BookingSettings/BookingSettings';
import {
  useMentorDefaults,
  useSaveMentorDefaults,
  useSessionsUsingRules,
} from '@/lib/api/data/sessionTypes';
import { BOOKING_COPY } from '@/lib/copy/mentorSettings';
import { SAVE_COPY } from '@/lib/copy/settings';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { resolveDefaults } from '@/lib/utils/sessionTypeDraft';
import type { PanelHandle } from './ProfilePanel';

/** How long "Changes saved" stays (the design's flash, as Profile's). */
const TOAST_MS = 5000;

const same = (a: BookingSettingsValue, b: BookingSettingsValue) =>
  a.requiresApproval === b.requiresApproval &&
  a.durationMin === b.durationMin &&
  a.noticeHours === b.noticeHours &&
  a.windowDays === b.windowDays &&
  a.breakMin === b.breakMin;

/**
 * Settings › Booking rules for a mentor (Mentor Settings.dc.html `isBooking`,
 * bookingSave=explicit): any change raises the save bar; Save writes approval
 * and the four defaults to the mentor profile, as Calendar's form does.
 * Bookings already made keep their rules (S2); the note says so.
 */
export const BookingPanel = forwardRef<PanelHandle, { userId: string }>(function BookingPanel(
  { userId },
  ref,
) {
  const defaults = useMentorDefaults(userId);
  const saving = useSaveMentorDefaults(userId);
  const sessionsUsingRules = useSessionsUsingRules(true);

  // `base` is what's saved; `draft` is the form. The server's values come in
  // only while there's nothing unsaved (a refetch must not wipe an edit).
  const [base, setBase] = useState<BookingSettingsValue | null>(null);
  const [draft, setDraft] = useState<BookingSettingsValue | null>(null);
  const dirty = !!base && !!draft && !same(base, draft);
  if (defaults.data) {
    // Unset values show the platform's; a window above a lowered cap is
    // already shown at the cap by the hook.
    const server: BookingSettingsValue = resolveDefaults(defaults.data);
    if (!base || (!dirty && !same(base, server))) {
      setBase(server);
      setDraft(server);
    }
  }

  const [toast, setToast] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // The save bar goes when the form is clean again: focus it held moves to
  // the first card's heading rather than falling to the page (WCAG 2.4.3).
  const keepFocus = () => {
    const at = document.activeElement;
    if (!at || at === document.body || at.closest('[data-save-bar]'))
      requestAnimationFrame(() => heading.current?.focus());
  };

  const discard = () => {
    if (base) setDraft(base);
    saving.reset();
    keepFocus();
  };

  const save = async (): Promise<boolean> => {
    if (!base || !draft || !defaults.data || saving.isPending) return false;
    try {
      await saving.save({
        ...draft,
        maxWindowDays: defaults.data.maxWindowDays,
        platformWindowDays: defaults.data.platformWindowDays,
      });
    } catch {
      return false;
    }
    keepFocus();
    setBase(draft);
    setToast(BOOKING_COPY.saved);
    return true;
  };

  useImperativeHandle(ref, () => ({ dirty: () => dirty, save, discard }));
  useLeaveGuard(dirty, BOOKING_COPY.rulesTitle, save);

  // Error before content: a failed first load says so, with Try again.
  if (defaults.error && !defaults.data)
    return <BookingSettings state="error" onRetry={defaults.retry} />;
  if (!draft) return <BookingSettings state="loading" />;

  const failed = saving.error
    ? saving.error.kind === 'offline'
      ? BOOKING_COPY.saveOffline
      : BOOKING_COPY.saveFailed
    : null;

  return (
    <>
      <BookingSettings
        state="ready"
        value={draft}
        onChange={(next) => {
          // A new edit after "Changes saved": the bar comes straight back.
          setToast(null);
          setDraft(next);
        }}
        maxWindowDays={defaults.data?.maxWindowDays}
        responseWindowHours={defaults.data?.responseWindowHours ?? null}
        sessionsUsingRules={sessionsUsingRules}
        disabled={saving.isPending}
        headingRef={heading}
      />
      {dirty && (
        <SaveBar
          label={SAVE_COPY.barLabel}
          message={BOOKING_COPY.saveBar}
          error={failed}
          discardLabel={SAVE_COPY.discard}
          saveLabel={SAVE_COPY.save}
          savingLabel={SAVE_COPY.saving}
          saving={saving.isPending}
          onDiscard={discard}
          onSave={() => void save()}
        />
      )}
      <Snackbar message={toast} />
    </>
  );
});
