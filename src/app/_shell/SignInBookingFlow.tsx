'use client';

import { useState } from 'react';
import { BookingFlow, type BookingFlowProps } from '@/components/organisms/BookingFlow/BookingFlow';
import { useBookingSignIn } from './useBookingSignIn';

type Props = Omit<BookingFlowProps, 'guest'>;

/** A guest's booking: the flow with the page-side sign-in for its guest step. */
function GuestBookingFlow(props: Props) {
  const guest = useBookingSignIn({ profileHref: props.mentor.profileHref });
  return <BookingFlow {...props} guest={guest} />;
}

/**
 * BookingFlow with a real guest step: a guest signs in (or creates an
 * account) inside the modal. Whether this booking is a guest's is decided
 * once, as the modal opens: signing in turns `isGuest` off mid-flow, and
 * switching components then would throw the booking away. Mounted with the
 * modal, so each booking starts its sign-in afresh. Every screen that books
 * uses this, not BookingFlow.
 */
export function SignInBookingFlow(props: Props) {
  const [guestAtOpen] = useState(props.isGuest);
  return guestAtOpen ? <GuestBookingFlow {...props} /> : <BookingFlow {...props} />;
}
