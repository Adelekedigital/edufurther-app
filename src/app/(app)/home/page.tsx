import type { Metadata } from 'next';
import { MenteeHomeScreen } from './_components/MenteeHomeScreen';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your next session and your progress on your study-abroad journey.',
};

export default function HomePage() {
  return <MenteeHomeScreen />;
}
