'use client';

import { useEffect, useState } from 'react';
import { MatchPill } from '@/components/molecules/MatchPill/MatchPill';
import { MatchPrompt } from '@/components/molecules/MatchPrompt/MatchPrompt';
import { PageHero } from '@/components/molecules/PageHero/PageHero';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import { TopicFilter } from '@/components/molecules/TopicFilter/TopicFilter';
import { FeaturedMentor } from '@/components/organisms/FeaturedMentor/FeaturedMentor';
import { FeaturedMentorSkeleton } from '@/components/organisms/FeaturedMentor/FeaturedMentorSkeleton';
import { BookingFlow } from '@/components/organisms/BookingFlow/BookingFlow';
import { MentorResults } from '@/components/organisms/MentorResults/MentorResults';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useBookingOptions, useRequestBooking } from '@/lib/api/data/booking';
import { useFeaturedMentor, useMentors, useTopics } from '@/lib/api/data/mentors';
import { useViewer } from '@/lib/api/data/viewer';
import { deviceTimeZone } from '@/lib/utils/format';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import type { Mentor } from '@/types/mentor';
import styles from './ExploreScreen.module.css';
import { pillLayout, useFloatingPrompt } from './useFloatingPrompt';

/** Results update this long after typing stops; Enter applies at once (Design decisions §1). */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * "Find my mentor matches" goes to an external Cal booking page for now (product
 * decision, 2026-09-26). TEMPORARY: matching must move onto the platform — see
 * project-conventions → Known rough edges. Unset → the prompt is not rendered.
 */
const MATCH_CALL_URL = process.env.NEXT_PUBLIC_MATCH_CALL_URL ?? '';

/**
 * Design matchPrompt: signed-in mentees with ≤ 2 sessions only. Guests don't see
 * it — matching needs an account, and they have "Get started free" instead.
 */
const MATCH_PROMPT_MAX_SESSIONS = 2;
const MATCH_PROMPT_BODY =
  'Share your goals and we’ll suggest mentors who fit your path, so your first sessions count.';

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
  // One card per row under 768px, two above — the match prompt goes after the first row.
  const cardsPerRow = useMediaQuery('(max-width: 767px)') ? 1 : 2;
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

  // Hidden while searching and on the no-mentors / error states (Design decisions: featured).
  const noSupply =
    !results.isLoading &&
    !results.error &&
    results.mentors.length === 0 &&
    offerings.length === 0 &&
    !q;
  const featuredOn = !q && !results.error && !noSupply;
  const featuredQuery = useFeaturedMentor(featuredOn);
  const featured = featuredQuery.featured;

  const showMatchPrompt =
    !!MATCH_CALL_URL &&
    viewer.kind === 'mentee' &&
    viewer.completedSessions <= MATCH_PROMPT_MAX_SESSIONS;
  const matchPrompt = showMatchPrompt ? (
    <MatchPrompt href={MATCH_CALL_URL} external body={MATCH_PROMPT_BODY} />
  ) : null;

  // Floating pill once the in-page prompt scrolls away (design promptSticky=on).
  // × minimises it for the session; it hides while a booking is open.
  const [pillMinimised, setPillMinimised] = useState(false);
  const floating = useFloatingPrompt(showMatchPrompt, !guest);
  const showPill = showMatchPrompt && floating.passed && !booking;
  const pill = pillLayout(floating, pillMinimised);

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

        {featuredOn && featuredQuery.isLoading && <FeaturedMentorSkeleton />}
        {featuredOn && featured && (
          <FeaturedMentor
            mentor={featured}
            onBook={setBooking}
            timeZone={timeZone}
            offline={!online}
          />
        )}

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
          // Design default cardTopics=hide; topics show on the profile and when booking.
          showTopics={false}
          interstitial={matchPrompt}
          interstitialAfter={cardsPerRow}
        />
      </div>

      {showPill && (
        <MatchPill
          href={MATCH_CALL_URL}
          external
          size={pill.size}
          dock={pill.dock}
          bottom={pill.bottom}
          tracking={pill.tracking}
          // Phones: the icon explains itself in a popover. Desktop: it only exists after
          // ×, and restores the full pill.
          miniAction={floating.isMobile ? 'popover' : 'restore'}
          body={MATCH_PROMPT_BODY}
          onMinimise={() => setPillMinimised(true)}
          onRestore={() => setPillMinimised(false)}
        />
      )}

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
