import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ADMIN_EMAILS_LIVE } from '@/lib/config/adminEmails';
import { ADMIN_PAGES } from '@/lib/copy/admin';
import { AdminEmailsScreen } from './_components/AdminEmailsScreen';

export const metadata: Metadata = { title: ADMIN_PAGES.emails.title };

/** Behind ADMIN_EMAILS_LIVE until the backend routes ship; off, not found. */
export default function AdminEmailsPage() {
  if (!ADMIN_EMAILS_LIVE) notFound();
  // The screen reads ?view= (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <AdminEmailsScreen />
    </Suspense>
  );
}
