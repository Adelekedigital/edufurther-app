'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookingFlow, type BookingFlowProps } from '@/components/organisms/BookingFlow/BookingFlow';
import { Toast } from '@/components/molecules/Toast/Toast';
import { FINISH_SETUP_COPY } from '@/lib/copy/booking';
import { accessFor } from '@/lib/utils/access';
import {
  clearBookingDraft,
  readBookingDraft,
  saveBookingDraft,
  type BookingDraft,
} from '@/lib/utils/bookingDraft';
import { profileHandle } from '@/lib/utils/guestBooking';
import { useAppShell } from './useAppShell';
import { useBookingSignIn } from './useBookingSignIn';

type FlowProps = Omit<BookingFlowProps, 'guest'>;

type Props = Omit<FlowProps, 'isGuest'> & {
  /** Null while the viewer is still being read: the modal waits for the answer. */
  isGuest: boolean | null;
};

/** How long "1 free credit added" stays: it only says what happened. */
const CREDIT_TOAST_MS = 4000;

/**
 * Round 4's "Finish setup" (BookingModal.dc.html): whether the viewer still
 * owes onboarding, and the hand-off that keeps the booking for this tab
 * (bookingDraft) and goes to onboarding, which brings them back here. Read
 * live, so a guest who signs in to an unfinished account gets it too.
 */
function useFinishSetup(mentor: FlowProps['mentor']) {
  const { viewer } = useAppShell();
  const router = useRouter();
  const memberId = viewer.kind === 'member' ? viewer.id : null;
  const setupUnfinished = accessFor(viewer).state === 'menteeSetup';
  const handle = profileHandle(mentor.profileHref);
  const onFinishSetup: BookingFlowProps['onFinishSetup'] =
    memberId && handle
      ? (d) => {
          saveBookingDraft(memberId, { mentorId: mentor.id, handle, ...d });
          const q = new URLSearchParams({
            for: handle,
            sid: d.sessionTypeId,
            time: d.time,
            after: 'booking',
          });
          router.push(`/onboarding?${q.toString()}`);
        }
      : undefined;
  return { memberId, setupUnfinished, onFinishSetup };
}

/** A guest's booking: the flow with the page-side sign-in for its guest step. */
function GuestBookingFlow(props: FlowProps) {
  const guest = useBookingSignIn({ profileHref: props.mentor.profileHref });
  const { setupUnfinished, onFinishSetup } = useFinishSetup(props.mentor);
  return (
    <BookingFlow
      {...props}
      guest={guest}
      setupUnfinished={setupUnfinished}
      onFinishSetup={onFinishSetup}
    />
  );
}

/**
 * A member's booking. On the way back from onboarding the profile reopens
 * the booking with the kept time (`?book=&at=`): the draft for exactly that
 * mentor, session and time fills the answers back in and says the credit
 * came. Any other open of this mentor starts clean.
 */
function MemberBookingFlow(props: FlowProps) {
  const { memberId, setupUnfinished, onFinishSetup } = useFinishSetup(props.mentor);
  // Read once, when the flow opens.
  const [draft] = useState<BookingDraft | null>(() => {
    const d = memberId ? readBookingDraft(memberId) : null;
    const sameType = !props.sessionTypeId || d?.sessionTypeId === props.sessionTypeId;
    return d && d.mentorId === props.mentor.id && d.time === props.initialTime && sameType
      ? d
      : null;
  });
  // Opened after mounting, so the status region is there first and it's read out.
  const [creditToast, setCreditToast] = useState(false);
  const justFinished = !!draft?.finished && !setupUnfinished;
  useEffect(() => {
    if (!justFinished || !memberId || !draft) return;
    // Said once: the draft stays for its answers (its clock kept), no longer as just finished.
    saveBookingDraft(memberId, { ...draft, finished: false });
    // On the next tick, into the region already there; gone after a few seconds.
    const open = setTimeout(() => setCreditToast(true), 0);
    const close = setTimeout(() => setCreditToast(false), CREDIT_TOAST_MS);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [justFinished, memberId, draft]);
  // Sent: nothing to come back to. Only this booking's draft.
  const sentDone = props.requestDone;
  useEffect(() => {
    if (sentDone && memberId && draft) clearBookingDraft(memberId);
  }, [sentDone, memberId, draft]);

  return (
    <>
      <BookingFlow
        {...props}
        setupUnfinished={setupUnfinished}
        onFinishSetup={onFinishSetup}
        startAfterTime={draft ? true : props.startAfterTime}
        initialAnswers={draft?.answers}
        missedNote={draft ? FINISH_SETUP_COPY.taken : undefined}
      />
      <Toast open={creditToast} icon="redeem" title={FINISH_SETUP_COPY.credit} />
    </>
  );
}

/**
 * BookingFlow with a real guest step: a guest signs in (or creates an
 * account) inside the modal. Whether this booking is a guest's is decided
 * once, from the first known answer: signing in turns `isGuest` off
 * mid-flow, and switching components then would throw the booking away.
 * Until the viewer is known nothing renders, so a guest who taps Book while
 * the page is still loading is never locked into the member flow. Mounted
 * with the modal, so each booking starts its sign-in afresh. Every screen
 * that books uses this, not BookingFlow.
 */
export function SignInBookingFlow({ isGuest, ...props }: Props) {
  const [guestAtOpen, setGuestAtOpen] = useState(isGuest);
  // Latched in render (the derived-state pattern), once, when the answer arrives.
  if (guestAtOpen === null && isGuest !== null) setGuestAtOpen(isGuest);
  if (guestAtOpen === null) return null;
  return guestAtOpen ? (
    <GuestBookingFlow {...props} isGuest />
  ) : (
    <MemberBookingFlow {...props} isGuest={isGuest ?? false} />
  );
}
