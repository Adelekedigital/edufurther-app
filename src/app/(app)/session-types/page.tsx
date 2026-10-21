import type { Metadata } from 'next';
import { SessionTypesScreen } from './_components/SessionTypesScreen';
import { SESSIONS_COPY } from '@/lib/copy/sessionTypes';

export const metadata: Metadata = {
  title: SESSIONS_COPY.title,
  description: 'What mentees can book with you.',
};

export default function SessionTypesPage() {
  return <SessionTypesScreen />;
}
