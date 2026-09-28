import type { Metadata } from 'next';
import { SessionTypesScreen } from './_components/SessionTypesScreen';

export const metadata: Metadata = {
  title: 'Session types',
  description: 'What mentees can book with you.',
};

export default function SessionTypesPage() {
  return <SessionTypesScreen />;
}
