'use client';

import { useEffect, useState } from 'react';
import { MatchPill } from '@/components/molecules/MatchPill/MatchPill';
import type { AccountMenuItem } from '@/components/molecules/AccountMenu/AccountMenu';
import { MatchPrompt } from '@/components/molecules/MatchPrompt/MatchPrompt';
import { Notice } from '@/components/molecules/Notice/Notice';
import { PageHero } from '@/components/molecules/PageHero/PageHero';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import { TopicFilter } from '@/components/molecules/TopicFilter/TopicFilter';
import { FeaturedMentor } from '@/components/organisms/FeaturedMentor/FeaturedMentor';
import { FeaturedMentorSkeleton } from '@/components/organisms/FeaturedMentor/FeaturedMentorSkeleton';
import { BookingFlow } from '@/components/organisms/BookingFlow/BookingFlow';
import { MentorResults } from '@/components/organisms/MentorResults/MentorResults';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useSignOut } from '@/lib/api/data/auth';
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
  const member = viewer.kind === 'member' ? viewer : null;
  const chrome =
    viewer.kind === 'guest'
      ? 'guest'
      : viewer.kind === 'member' ||
          viewer.kind === 'unlinked' ||
          viewer.kind === 'error' ||
          (viewer.kind === 'loading' && viewer.signedIn)
        ? 'member'
        : 'pending';
  const signOut = useSignOut();
  // No backend account yet: booking can't succeed, so the buttons say why instead.
  const bookBlocked = viewer.kind === 'unlinked' ? 'Finish account setup to book' : null;

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

  // Mentees, or new members who aren't mentors either (no goal yet = not onboarded).
  const showMatchPrompt =
    !!MATCH_CALL_URL &&
    !!member &&
    (member.isMentee || !member.isApprovedMentor) &&
    member.completedSessions <= MATCH_PROMPT_MAX_SESSIONS;
  const matchPrompt = showMatchPrompt ? (
    <MatchPrompt href={MATCH_CALL_URL} external body={MATCH_PROMPT_BODY} />
  ) : null;

  // Floating pill once the in-page prompt scrolls away (design promptSticky=on).
  // × minimises it for the session; it hides while a booking is open.
  const [pillMinimised, setPillMinimised] = useState(false);
  const floating = useFloatingPrompt(showMatchPrompt, chrome === 'member');
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

  // AppShell.dc.html account menu, mentee variant. "View profile" and "Feedback"
  // have no destination yet (no profile / feedback screens), so they wait —
  // design-divergence.md. Notifications likewise (no backend).
  const accountItems: AccountMenuItem[] = [
    ...(MATCH_CALL_URL && (!member || member.isMentee || !member.isApprovedMentor)
      ? [
          {
            key: 'matches',
            label: 'Find my mentor matches',
            icon: 'route' as const,
            href: MATCH_CALL_URL,
            external: true,
          },
        ]
      : []),
    {
      key: 'logout',
      label: 'Logout',
      icon: 'logout',
      danger: true,
      onSelect: () => void signOut(),
    },
  ];

  return (
    <AppShell
      active="Explore"
      chrome={chrome}
      account={
        chrome === 'member' ? { initial: member?.initial ?? '', items: accountItems } : undefined
      }
      offline={!online}
    >
      <div className={styles.page}>
        {viewer.kind === 'error' && (
          // PROVISIONAL copy: /me failed. The page still works as a public list.
          <Notice tone="neutral" icon="error" title="We couldn’t load your account.">
            Mentors below still work.{' '}
            <button type="button" className={styles.inlineAction} onClick={viewer.retry}>
              Try again
            </button>
          </Notice>
        )}
        {viewer.kind === 'unlinked' && (
          // PROVISIONAL (backend auth reply 2026-09-27): no self-signup yet, so a new
          // email signs in to no account. Copy until the product decides the flow.
          <Notice tone="info" icon="new_releases" title="Your account isn’t ready yet.">
            You can browse mentors now. Booking opens once your account is set up.
          </Notice>
        )}
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
            bookBlocked={bookBlocked}
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
          bookBlocked={bookBlocked}
          selfId={member?.isApprovedMentor ? member.id : null}
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
