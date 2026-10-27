import type { Metadata } from 'next';
import { PageHeader } from '@/components/molecules/PageHeader/PageHeader';
import { ADMIN_PAGES } from '@/lib/copy/admin';

export const metadata: Metadata = { title: ADMIN_PAGES.mentors.title };

export default function AdminMentorsPage() {
  return <PageHeader {...ADMIN_PAGES.mentors} />;
}
