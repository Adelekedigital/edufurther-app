import type { Metadata } from 'next';
import { MenteeHomeGate } from './_components/MenteeHomeGate';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your next session and your progress on your study-abroad journey.',
};

export default function HomePage() {
  return <MenteeHomeGate />;
}
