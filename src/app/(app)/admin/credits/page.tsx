import type { Metadata } from 'next';
import { ADMIN_PAGES } from '@/lib/copy/admin';
import { AdminCreditsScreen } from './_components/AdminCreditsScreen';

export const metadata: Metadata = { title: ADMIN_PAGES.credits.title };

export default function AdminCreditsPage() {
  return <AdminCreditsScreen />;
}
