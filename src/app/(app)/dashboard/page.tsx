import type { Metadata } from 'next';
import { DashboardScreen } from './_components/DashboardScreen';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your mentoring at a glance.',
};

export default function DashboardPage() {
  return <DashboardScreen />;
}
