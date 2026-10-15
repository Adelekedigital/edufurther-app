import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BookingsScreen } from './_components/BookingsScreen';

export const metadata: Metadata = {
  title: 'Bookings',
  description: 'The sessions you’ve booked, the requests waiting, and everything past.',
};

export default function BookingsPage() {
  // The screen reads ?tab= (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <BookingsScreen />
    </Suspense>
  );
}
