import type { Metadata } from 'next';
import { ADMIN_PAGES } from '@/lib/copy/admin';
import { AdminMentorsScreen } from './_components/AdminMentorsScreen';

export const metadata: Metadata = { title: ADMIN_PAGES.mentors.title };

export default function AdminMentorsPage() {
  return <AdminMentorsScreen />;
}
