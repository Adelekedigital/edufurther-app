import type { Metadata } from 'next';
import { PageHeader } from '@/components/molecules/PageHeader/PageHeader';
import { ADMIN_PAGES } from '@/lib/copy/admin';

export const metadata: Metadata = { title: ADMIN_PAGES.credits.title };

export default function AdminCreditsPage() {
  return <PageHeader {...ADMIN_PAGES.credits} />;
}
