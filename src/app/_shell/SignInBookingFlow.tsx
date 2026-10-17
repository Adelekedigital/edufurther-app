'use client';

import { useState } from 'react';
import { BookingFlow, type BookingFlowProps } from '@/components/organisms/BookingFlow/BookingFlow';
import { useBookingSignIn } from './useBookingSignIn';

type FlowProps = Omit<BookingFlowProps, 'guest'>;

type Props = Omit<FlowProps, 'isGuest'> & {
  /** Null while the viewer is still being read: the modal waits for the answer. */
  isGuest: boolean | null;
};

/** A guest's booking: the flow with the page-side sign-in for its guest step. */
function GuestBookingFlow(props: FlowProps) {
  const guest = useBookingSignIn({ profileHref: props.mentor.profileHref });
  return <BookingFlow {...props} guest={guest} />;
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
    <BookingFlow {...props} isGuest={isGuest ?? false} />
  );
}
