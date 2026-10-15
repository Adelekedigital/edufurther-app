import type { Metadata } from 'next';
import { CalendarScreen } from './_components/CalendarScreen';

export const metadata: Metadata = {
  title: 'Calendar',
  description: 'When mentees can book you.',
};

export default function CalendarPage() {
  return <CalendarScreen />;
}
