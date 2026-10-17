'use client';

import { BookingFlow, type BookingFlowProps } from '@/components/organisms/BookingFlow/BookingFlow';
import { useBookingSignIn } from './useBookingSignIn';

/**
 * BookingFlow with a real guest step: a guest signs in (or creates an
 * account) inside the modal. Mounted with the modal, so each booking starts
 * its sign-in afresh. Every screen that books uses this, not BookingFlow.
 */
export function SignInBookingFlow(props: Omit<BookingFlowProps, 'guest'>) {
  const guest = useBookingSignIn({ profileHref: props.mentor.profileHref });
  return <BookingFlow {...props} guest={props.isGuest ? guest : undefined} />;
}
