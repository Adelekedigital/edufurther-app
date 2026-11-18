import type { Ref } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MatchReason } from '@/components/molecules/MatchReason/MatchReason';
import { Notice } from '@/components/molecules/Notice/Notice';
import { GUEST_COPY, MATCH_COPY } from '@/lib/copy/onboarding';
import { reasonLine } from '@/lib/utils/matchReason';
import type { AppError, Mentor } from '@/types/mentor';
import type { MentorMatch } from '@/types/onboarding';
import { MentorCard } from '../MentorCard/MentorCard';
import { cx } from '@/lib/utils/cx';
import styles from './MatchResults.module.css';

export type MatchResultsProps = {
  matches: MentorMatch[];
  /**
   * A guest back from Book (PRD US-6): `available` shows only their mentor;
   * otherwise the notice and the other matches (Mentee Onboarding v5 `unavailable`).
   */
  guest?: { firstName: string; available: boolean };
  /** False: nobody matches on study country or degree, so these are the closest. */
  exact: boolean;
  isLoading: boolean;
  error: AppError | null;
  onRetry: () => void;
  /** Help-area slugs the mentee picked: those topics show first on each card. */
  highlight: string[];
  /** Phones: the design's compact card. */
  compact: boolean;
  timeZone: string;
  offline: boolean;
  onBook: (m: Mentor) => void;
  onMoreTopics?: (m: Mentor) => void;
  /**
   * "Skip for now", top right (MatchSkip.dc.html): onboarding is already done
   * here, so it goes Home. None on the guest path (they came to book).
   */
  onSkip?: () => void;
  /** "First session free" under each card, while the starter credit is unused (Home's rule). */
  starterFree: boolean;
  browseHref: string;
  /** The page moves focus here when the matches step opens. */
  headingRef?: Ref<HTMLHeadingElement>;
};

/** The design's loading card (Mentee Onboarding v5.dc.html `mLoading`). */
function MatchSkeleton() {
  return (
    <div className={styles.skeleton}>
      <Skeleton width="64px" height="64px" radius="full" />
      <Skeleton width="60%" height="16px" />
      <Skeleton width="85%" height="12px" />
      <Skeleton width="40%" height="12px" />
      <Skeleton height="40px" radius="md" />
    </div>
  );
}

/**
 * "Your top 2 mentor matches" (Mentee Onboarding v5.dc.html, `isMatches`;
 * MatchSkip.dc.html, owner 2026-11-18): loading, error, empty and content,
 * error checked before empty. Each card carries its one-line "why"; the
 * heading, then each card, slides in (none with reduced motion). Props only;
 * the page fetches.
 */
export function MatchResults({ headingRef, ...p }: MatchResultsProps) {
  const { matches } = p;
  const g = p.guest;
  const unavailable = !!g && !g.available;
  const [title, sub] = p.isLoading
    ? [MATCH_COPY.loadingTitle, MATCH_COPY.loadingSub]
    : p.error
      ? [MATCH_COPY.errorPageTitle, null]
      : matches.length === 0
        ? [MATCH_COPY.errorPageTitle, null]
        : unavailable
          ? [GUEST_COPY.unavailableTitle, GUEST_COPY.unavailableSub]
          : g
            ? [GUEST_COPY.matchTitle(g.firstName), GUEST_COPY.matchSub(g.firstName)]
            : !p.exact
              ? [MATCH_COPY.noExactTitle, MATCH_COPY.noExactSub]
              : [MATCH_COPY.title(matches.length), MATCH_COPY.sub];
  const content = !p.isLoading && !p.error && matches.length > 0;

  return (
    <div className={styles.page}>
      {p.onSkip && (
        <div className={styles.skipRow}>
          <button type="button" className={styles.skip} onClick={p.onSkip}>
            {MATCH_COPY.skip}
          </button>
        </div>
      )}
      <header className={cx(styles.head, content && styles.reveal)}>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          {title}
        </h1>
        {sub && <p className={styles.sub}>{sub}</p>}
      </header>

      {/* Always in the DOM, so the switch from loading to results is heard. */}
      <p role="status" className="sr-only">
        {p.isLoading ? MATCH_COPY.loadingLabel : p.error ? '' : title}
      </p>

      {unavailable && !p.isLoading && !p.error && matches.length > 0 && (
        <Notice tone="brand" title={GUEST_COPY.unavailableNotice(g.firstName)} live={false}>
          {GUEST_COPY.unavailableBody}
        </Notice>
      )}

      {p.isLoading ? (
        <div aria-busy className={styles.grid}>
          <MatchSkeleton />
          <MatchSkeleton />
        </div>
      ) : p.error ? (
        <div role="alert" className={styles.error}>
          <EmptyState
            illustration="forms"
            title={MATCH_COPY.errorTitle}
            description={MATCH_COPY.errorBody}
          />
          <Button size="medium" onClick={p.onRetry}>
            {MATCH_COPY.retry}
          </Button>
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          illustration="team"
          title={MATCH_COPY.emptyTitle}
          description={MATCH_COPY.emptyBody}
          actions={
            <ButtonLink href={p.browseHref} size="large" prefetch={false}>
              {MATCH_COPY.emptyAction}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul className={styles.grid} aria-label="Mentor matches">
            {matches.map((mt) => {
              return (
                <li key={mt.mentor.id} className={cx(styles.item, styles.reveal)}>
                  {(() => {
                    const line = reasonLine(mt.reasons, {
                      level: mt.level,
                      studyCountry: mt.studyCountry,
                    });
                    return line && <MatchReason line={line} />;
                  })()}
                  <MentorCard
                    mentor={mt.mentor}
                    variant={p.compact ? 'compact' : 'photo'}
                    headingLevel={2}
                    highlight={p.highlight}
                    onMoreTopics={p.onMoreTopics}
                    onBook={p.onBook}
                    offline={p.offline}
                    timeZone={p.timeZone}
                  />
                  {p.starterFree && (
                    <Badge type="accent" color="green" shape="pill" className={styles.free}>
                      {MATCH_COPY.firstFree}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
          {matches.length === 1 && !g && <p className={styles.oneNote}>{MATCH_COPY.oneNote}</p>}
        </>
      )}

      {matches.length > 0 || p.isLoading || p.error ? (
        <Link href={p.browseHref} prefetch={false} className={styles.browse}>
          {MATCH_COPY.browse}
          <Icon name="arrow_forward" size={18} />
        </Link>
      ) : null}
    </div>
  );
}
