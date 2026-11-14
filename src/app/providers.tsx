'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyPartFailures } from '@/components/molecules/LazyPart/lazyPart';
import { SessionHintProvider } from '@/lib/api/data/session';
import { AnalyticsRoot } from './_shell/AnalyticsRoot';
import { PreviewRoot } from './_shell/PreviewRoot';
import type { SessionState } from '@/lib/vendor/supabase/browser';

export function Providers({
  session,
  children,
}: {
  /** The proxy's verified answer for the first render; null when unknown. */
  session: SessionState | null;
  children: ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: true, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SessionHintProvider hint={session}>
        {/* Preview as user: the bar above every app screen, when an admin previews. */}
        <PreviewRoot>{children}</PreviewRoot>
        {/* PRD 30: the consent banner, page views and the analytics vendor. Off by flag. */}
        <AnalyticsRoot />
        {/* A lazy part (a dialog, a tool) that couldn't load: the one reload offer. */}
        <LazyPartFailures />
      </SessionHintProvider>
    </QueryClientProvider>
  );
}
