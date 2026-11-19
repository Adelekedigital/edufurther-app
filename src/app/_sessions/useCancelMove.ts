'use client';

import { useState } from 'react';
import { useSessionTypes } from '@/lib/api/data/booking';
import { useMoveSession } from '@/lib/api/data/moveSession';
import { canMoveSession } from '@/lib/utils/bookings';
import type { Booking } from '@/types/booking';
import type { SessionType } from '@/types/mentor';
import type { MoveOption } from './ConfirmActionDialog';

/**
 * What the screen does once a move has landed: `leaving` holds the dialog on
 * "Working…" until the page has gone; `done` closes it where it is.
 */
export type MoveLanding = 'leaving' | 'done';

type Options = {
  /**
   * The booking on screen, read live (Session Join's room, Bookings' open
   * panel). Its session types are read ahead, so Cancel usually opens straight
   * on the move view, and a move sends the latest copy of the row.
   */
  live: Booking | null;
  /** The screen's clock, when it keeps one; the device's otherwise. */
  now?: Date;
  /** Where the move goes next: a confirmed session, or a request awaiting the mentor. */
  onMoved: (newId: string, confirmed: boolean) => MoveLanding;
};

/**
 * Cancel with the option to move (PRD fix 1): one implementation for every
 * screen a mentee cancels a confirmed session from, so the dialog is the same
 * wherever they press it. Give `move` to ConfirmActionDialog; it decides per
 * tick whether the move view fits (mentee, confirmed, refundable by the row's
 * own deadline).
 */
export function useCancelMove({ live, now, onMoved }: Options) {
  const move = useMoveSession();
  // The booking being cancelled, while the dialog is open.
  const [target, setTarget] = useState<Booking | null>(null);
  // The old session ends with the move, which would send a page showing it
  // elsewhere, so the screen holds until it has gone to the new one.
  const [moved, setMoved] = useState(false);
  const holding = move.isPending || moved;
  // The session as it was when Move was pressed, shown until the outcome is
  // known: never a bare "Canceled" behind a move about to land.
  const [movingFrom, setMovingFrom] = useState<Booking | null>(null);

  // The session type as offered now, for the move (form, approval). Taken
  // when the dialog opens, or once it answers if still loading, so a later
  // refetch never changes the view under the reader.
  const subject = target ?? live;
  const types = useSessionTypes(
    subject && canMoveSession(subject, now ?? new Date()) ? subject.other.id : null,
  );
  const liveType = types.data?.find((t) => t.id === subject?.sessionTypeId) ?? null;
  const [moveType, setMoveType] = useState<SessionType | null>(null);
  // Opened and not snapshotted yet (adjusting state while rendering).
  const [awaitingType, setAwaitingType] = useState(false);
  if (awaitingType && !types.isLoading) {
    setAwaitingType(false);
    setMoveType(liveType);
  }

  const close = () => {
    move.reset();
    setTarget(null);
    setMoveType(null);
    setAwaitingType(false);
  };

  // The latest copy of the row being cancelled, for the request.
  const current = target && live?.id === target.id ? live : target;

  const option: MoveOption | 'loading' | undefined = !current
    ? undefined
    : awaitingType
      ? 'loading'
      : moveType
        ? {
            sessionType: moveType,
            // "Working…" until the page has gone to the new session.
            pending: holding,
            error: move.error?.message ?? null,
            onMove: ({ startsAt, message }) => {
              setMovingFrom(current);
              move.move({ booking: current, startsAt, message }, (newId, confirmed) => {
                if (onMoved(newId, confirmed) === 'leaving') setMoved(true);
                else {
                  setMovingFrom(null);
                  close();
                }
              });
            },
          }
        : undefined;

  return {
    /** Cancel was pressed on this booking. */
    open: (b: Booking) => {
      setTarget(b);
      setMoveType(null);
      setAwaitingType(true);
    },
    /** The dialog closed. Not while `busy`: vanishing reads as "done". */
    close,
    /** Cancel is open on a booking. */
    isOpen: !!target,
    /** The dialog's `move`. */
    move: option,
    /** The move is running, or has landed and the page is leaving. */
    holding,
    /** The booking as it was when Move was pressed, while `holding`. */
    movingFrom: holding ? movingFrom : null,
    /** The move's call is in flight. */
    busy: move.isPending,
  };
}
