import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ADMIN_ANALYTICS_LIVE } from '@/lib/config/adminAnalytics';
import { ANALYTICS_PAGE } from '@/lib/copy/adminAnalytics';
import { AdminAnalyticsScreen } from './_components/AdminAnalyticsScreen';

export const metadata: Metadata = { title: ANALYTICS_PAGE.title };

/** Behind ADMIN_ANALYTICS_LIVE until PRD 30's tracking and the routes are live; off, not found. */
export default function AdminAnalyticsPage() {
  if (!ADMIN_ANALYTICS_LIVE) notFound();
  // The screen reads ?tab= (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <AdminAnalyticsScreen />
    </Suspense>
  );
}
