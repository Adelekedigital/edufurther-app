'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { usePushNotifications } from '@/lib/api/data/push';
import { PUSH_COPY } from '@/lib/copy/push';
import { markPushAsked, onPushMoment, pushAsked, type PushMoment } from '@/lib/utils/push';

/** Long enough to read and tap; Settings keeps the switch for later. */
const ASK_MS = 15_000;
/**
 * The ask comes a moment after the moment itself, so the screen's own toast
 * for it (only the newest toast shows) comes first and doesn't hide the ask.
 */
export const ASK_DELAY_MS = 1_200;
const OUTCOME_MS = 5_000;

type Toast = { text: string; stamp: number; ask: boolean };
type Ask = PushMoment | 'mentor';

/**
 * The one-time notifications ask (owner, 2026-11-07): after a meaningful
 * moment (a message sent, a booking made or accepted, or a mentor with
 * bookings on Home or Bookings), a toast with "Turn on",
 * once per device whatever the answer. Never before such a moment, never
 * where push can't be offered (lib/api/data/push), never once the browser has
 * been asked. The tap is what asks the browser, as iOS requires. Mounted once
 * in the app shell.
 */
export function PushPrompt({
  userId,
  mentorWithBookings = false,
}: {
  userId: string | null;
  /**
   * A mentor on Home or Bookings with at least one booking, upcoming or
   * pending (owner, 2026-11-08): the moment for mentors whose bookings confirm
   * themselves, who may never accept or send anything. From /me's counts.
   */
  mentorWithBookings?: boolean;
}) {
  const push = usePushNotifications(userId);
  const [toast, setToast] = useState<Toast | null>(null);
  // Read inside the moment listener without re-subscribing on every change.
  const askable = useRef(push.askable);
  useEffect(() => {
    askable.current = push.askable;
  }, [push.askable]);

  // An ask already on its way or showing: a second moment changes nothing.
  const pending = useRef(false);
  const ask = useCallback((moment: Ask) => {
    if (!askable.current || pushAsked() || pending.current) return;
    pending.current = true;
    setTimeout(() => {
      if (!askable.current || pushAsked()) {
        pending.current = false;
        return;
      }
      setToast({ text: PUSH_COPY.ask[moment], stamp: Date.now(), ask: true });
    }, ASK_DELAY_MS);
  }, []);
  useEffect(() => onPushMoment(ask), [ask]);
  // Once push can be offered here (its config has loaded), not before.
  useEffect(() => {
    if (mentorWithBookings && push.askable) ask('mentor');
  }, [mentorWithBookings, push.askable, ask]);

  // The outcome of a "Turn on" tap: asked, then running, then said.
  const phase = useRef<'idle' | 'asked' | 'running'>('idle');
  useEffect(() => {
    if (phase.current === 'asked' && push.busy) phase.current = 'running';
    if (phase.current !== 'running' || push.busy) return;
    phase.current = 'idle';
    const text =
      push.failure === 'blocked'
        ? PUSH_COPY.blocked
        : push.failure === 'failed'
          ? PUSH_COPY.failed
          : push.state === 'on'
            ? PUSH_COPY.on
            : null;
    setToast(text ? { text, stamp: Date.now(), ask: false } : null);
  }, [push.busy, push.failure, push.state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(
      () => {
        // Asked once it has been on screen its whole time, or tapped: never
        // before, so an ask nobody saw doesn't use up the device's one ask.
        if (toast.ask) {
          markPushAsked();
          pending.current = false;
        }
        setToast(null);
      },
      toast.ask ? ASK_MS : OUTCOME_MS,
    );
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <Snackbar
      message={toast?.text ?? null}
      stamp={toast?.stamp}
      action={
        toast?.ask
          ? {
              label: PUSH_COPY.turnOn,
              onClick: () => {
                phase.current = 'asked';
                markPushAsked();
                pending.current = false;
                setToast(null);
                push.turnOn();
              },
            }
          : undefined
      }
    />
  );
}
