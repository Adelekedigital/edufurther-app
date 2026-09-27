'use client';

import { useEffect, useState } from 'react';
import { PageHero } from '@/components/molecules/PageHero/PageHero';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import { TopicFilter } from '@/components/molecules/TopicFilter/TopicFilter';
import { BookingFlow } from '@/components/organisms/BookingFlow/BookingFlow';
import { MentorResults } from '@/components/organisms/MentorResults/MentorResults';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useBookingOptions, useRequestBooking } from '@/lib/api/data/booking';
import { useMentors, useTopics } from '@/lib/api/data/mentors';
import { useViewer } from '@/lib/api/data/viewer';
import { deviceTimeZone } from '@/lib/utils/format';
import { useOnline } from '@/lib/utils/useOnline';
import type { Mentor } from '@/types/mentor';
import styles from './ExploreScreen.module.css';

/** Results update this long after typing stops; Enter applies at once (Design decisions §1). */
const SEARCH_DEBOUNCE_MS = 300;

function countLabel(q: string, topicCount: number, total: number | null): string {
  const topics = topicCount ? ` for ${topicCount} topic${topicCount > 1 ? 's' : ''}` : '';
  // Design countMode=known when the API sends a total (backend reply #7, coming); unknown otherwise.
  if (total !== null) return `${total} mentor${total === 1 ? '' : 's'}${topics}`;
  if (q) return `Mentors matching “${q}”`;
  if (topicCount) return `Mentors for ${topicCount} topic${topicCount > 1 ? 's' : ''}`;
  return 'All mentors';
}

export function ExploreScreen() {
  const viewer = useViewer();
  const online = useOnline();
  const guest = viewer.kind === 'guest';

  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [offerings, setOfferings] = useState<string[]>([]);
  const [booking, setBooking] = useState<Mentor | null>(null);
  // Cards only render after a client fetch, so reading the device zone here is safe.
  const [timeZone] = useState(deviceTimeZone);

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const topics = useTopics();
  const results = useMentors({ q, offerings });
  const options = useBookingOptions(booking?.id ?? null);
  const request = useRequestBooking();

  const hasFilters = offerings.length > 0 || q.length > 0;
  const clearAll = () => {
    setInput('');
    setQ('');
    setOfferings([]);
  };
  const toggle = (slug: string) =>
    setOfferings((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  const closeBooking = () => {
    setBooking(null);
    request.reset();
  };

  return (
    <AppShell active="Explore" guest={guest} offline={!online}>
      <div className={styles.page}>
        <PageHero
          title="Find a mentor for your study-abroad journey"
          subtitle="Get guidance from mentors who have been through the process. Explore free 1:1 mentorship sessions."
        />

        <div className={styles.filters}>
          {/* Topics that fail to load leave search working; chips are hidden, not faked. */}
          {!topics.error && (
            <TopicFilter
              heading="What do you need help with?"
              topics={topics.topics}
              selected={offerings}
              onToggle={toggle}
              showClear={hasFilters || input.length > 0}
              onClear={clearAll}
              isLoading={topics.isLoading}
              disabled={!online}
            />
          )}
          <SearchField
            label="Search mentors"
            placeholder="Search mentors by name, school or program"
            value={input}
            onChange={setInput}
            onSubmit={(v) => setQ(v.trim())}
            onClear={() => {
              setInput('');
              setQ('');
            }}
            disabled={!online}
          />
        </div>

        <MentorResults
          mentors={results.mentors}
          isLoading={results.isLoading}
          isRefreshing={results.isRefreshing}
          error={results.error}
          onRetry={results.retry}
          countLabel={countLabel(q, offerings.length, results.total)}
          total={results.total}
          timeZone={timeZone}
          hasFilters={hasFilters}
          query={q}
          onClearSearch={clearAll}
          onBook={setBooking}
          offline={!online}
          restarted={results.restarted}
          onDismissRestarted={results.dismissRestarted}
          hasMore={results.hasMore}
          isLoadingMore={results.isLoadingMore}
          loadMoreError={results.loadMoreError}
          onLoadMore={results.loadMore}
        />
      </div>

      {booking && (
        <BookingFlow
          key={booking.id}
          mentor={booking}
          options={options.options}
          optionsLoading={options.isLoading}
          optionsError={options.error}
          onRetryOptions={options.retry}
          isGuest={guest}
          // PHASE A: no auth yet — continuing counts as signed up.
          onSignup={() => undefined}
          onRequest={request.request}
          requestPending={request.isPending}
          requestDone={request.isDone}
          requestError={request.error}
          onClose={closeBooking}
          deviceZone={timeZone}
          renderShell={(shell, body) => (
            <ModalShell
              title={shell.title}
              subtitle={shell.subtitle}
              size="xl"
              onClose={closeBooking}
            >
              {body}
            </ModalShell>
          )}
        />
      )}
    </AppShell>
  );
}
