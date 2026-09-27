import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Notice } from '@/components/molecules/Notice/Notice';
import type { ReactNode } from 'react';
import type { AppError, Mentor } from '@/types/mentor';
import { MentorCard } from '../MentorCard/MentorCard';
import { MentorCardSkeleton } from '../MentorCard/MentorCardSkeleton';
import styles from './MentorResults.module.css';

export type MentorResultsProps = {
  mentors: Mentor[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  onRetry: () => void;
  /** The heading above the grid, e.g. "Mentors for 2 topics". */
  countLabel: string;
  /** Matching mentors in total, when known — for "Showing 24 of 57 mentors". */
  total: number | null;
  timeZone: string;
  /** Filters or a query are applied. Drives which empty state shows. */
  hasFilters: boolean;
  /** Only used in the filtered-empty body. */
  query: string;
  onClearSearch: () => void;
  onBook: (m: Mentor) => void;
  offline: boolean;
  restarted: boolean;
  onDismissRestarted: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: AppError | null;
  onLoadMore: () => void;
  /** Topic tags on cards (design `cardTopics`, default hide). */
  showTopics: boolean;
  /**
   * A panel placed after the first row (`interstitialAfter` cards), or after the
   * pager when there is one row or less — the design's match prompt, `auto`.
   */
  interstitial?: ReactNode;
  interstitialAfter?: number;
};

/**
 * The Explore results region: loading, error, empty (filtered / no mentors at
 * all) and content, including paging and the refreshing overlay. Error is
 * checked before empty. Props only; the page fetches.
 */
export function MentorResults(p: MentorResultsProps) {
  if (p.isLoading) {
    return (
      <section aria-label="Mentors" aria-busy className={styles.grid}>
        <span className="sr-only" role="status">
          Loading mentors
        </span>
        {Array.from({ length: 4 }, (_, i) => (
          <MentorCardSkeleton key={i} />
        ))}
      </section>
    );
  }

  if (p.error) {
    const offline = p.error.kind === 'offline';
    return (
      <section aria-label="Mentors" className={styles.state}>
        <EmptyState
          illustration="forms"
          title="We couldn’t load mentors"
          description={
            offline
              ? // PROVISIONAL copy — offline with nothing cached is not designed.
                'You’re offline. Your filters are saved, so try again when you reconnect.'
              : 'Something went wrong on our side. Your filters are saved, so try again in a moment.'
          }
          actions={<Button onClick={p.onRetry}>Try again</Button>}
        />
      </section>
    );
  }

  if (p.mentors.length === 0) {
    return (
      <section aria-label="Mentors" className={styles.state}>
        {p.hasFilters ? (
          <EmptyState
            illustration="search-results"
            // PROVISIONAL copy: topics now match ANY-of (backend reply #1, revised), so the
            // design's "match all of that" / "remove a topic" no longer holds. Sent to design.
            title="No mentors match that"
            description={
              p.query
                ? `No one matches “${p.query}” for these topics. Try a different name, school or program, or other topics.`
                : 'No mentors help with these topics yet. Try other topics to see more mentors.'
            }
            actions={<Button onClick={p.onClearSearch}>Clear search</Button>}
          />
        ) : (
          // "Notify me" is held: nothing stores the request yet (backend reply, follow-up 2).
          <EmptyState
            illustration="team"
            title="Mentors are on their way"
            description="We’re welcoming mentors who’ve been through the study-abroad journey. Check back soon."
          />
        )}
      </section>
    );
  }

  const after = p.interstitialAfter ?? 2;
  const inRow = !!p.interstitial && p.mentors.length > after;
  const firstRow = inRow ? p.mentors.slice(0, after) : p.mentors;
  const rest = inRow ? p.mentors.slice(after) : [];
  const renderGrid = (list: Mentor[]) => (
    <ul
      className={p.isRefreshing ? `${styles.grid} ${styles.dim}` : styles.grid}
      inert={p.isRefreshing}
    >
      {list.map((m) => (
        <li key={m.id} className={styles.item}>
          <MentorCard
            mentor={m}
            onBook={p.onBook}
            offline={p.offline}
            timeZone={p.timeZone}
            showTopics={p.showTopics}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-labelledby="results-count" className={styles.results}>
      {p.offline && (
        <Notice tone="neutral" icon="cloud_off" title="You’re offline.">
          These are mentors from your last visit. Filters and booking come back when you reconnect.
        </Notice>
      )}
      {p.restarted && (
        <Notice
          tone="info"
          icon="refresh"
          title="The list was updated."
          onDismiss={p.onDismissRestarted}
        >
          New mentors joined while you were browsing, so we’ve started you back at the top.
        </Notice>
      )}

      <h2 id="results-count" className={styles.count}>
        {p.countLabel}
      </h2>

      <div className={styles.refreshWrap} aria-busy={p.isRefreshing || undefined}>
        {p.isRefreshing && (
          <span className={styles.bar} aria-hidden>
            <span className={styles.barFill} />
          </span>
        )}
        {renderGrid(firstRow)}
        {inRow && p.interstitial}
        {rest.length > 0 && renderGrid(rest)}
      </div>

      <div className={styles.pager} data-pager>
        {p.loadMoreError ? (
          <>
            <span role="alert" className={styles.pagerError}>
              <Icon name="error" size={18} className={styles.errorIcon} />
              We couldn’t load more mentors.
            </span>
            <Button variant="secondary-outlined" onClick={p.onLoadMore}>
              Try again
            </Button>
          </>
        ) : p.hasMore ? (
          <>
            <span className={styles.shown}>
              {p.total !== null
                ? `Showing ${p.mentors.length} of ${p.total} mentors`
                : `Showing ${p.mentors.length} mentors`}
            </span>
            <Button
              variant="secondary-outlined"
              onClick={p.onLoadMore}
              disabled={p.offline}
              busy={p.isLoadingMore}
            >
              {p.isLoadingMore ? 'Loading mentors…' : 'Show more mentors'}
            </Button>
          </>
        ) : (
          <span className={styles.shown}>
            That’s everyone for now. Try other topics to see more mentors.
          </span>
        )}
      </div>
      {p.interstitial && !inRow && p.interstitial}
    </section>
  );
}
