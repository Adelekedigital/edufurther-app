import type { Metadata } from 'next';
import { SessionJoinScreen } from './_components/SessionJoinScreen';
import { safeDecode } from '@/lib/utils/text';

export const metadata: Metadata = {
  title: 'Your session',
  description: 'The countdown, who’s here, and the way into your EduFurther session.',
};

/** `/sessions/{id}`: one booked session, before, during and after the call (Session Join.dc.html). */
export default async function SessionJoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  // A malformed %-sequence must not crash the render; the API answers it as not found.
  const id = safeDecode(raw) ?? raw;
  return <SessionJoinScreen key={id} id={id} />;
}
