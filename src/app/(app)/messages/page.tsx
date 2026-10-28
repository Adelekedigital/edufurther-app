import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MESSAGES_LIVE } from '@/lib/config/messages';
import { MessagesScreen, MessagesSkeleton } from './_components/MessagesScreen';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Chat with the mentors and mentees you’ve booked with.',
};

/** `/messages` (PRD Messages): behind MESSAGES_LIVE until the backend ships; off, not found. */
export default function MessagesPage() {
  if (!MESSAGES_LIVE) notFound();
  // The screen reads ?with= and ?settings= (useSearchParams): inside a boundary.
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesScreen />
    </Suspense>
  );
}
