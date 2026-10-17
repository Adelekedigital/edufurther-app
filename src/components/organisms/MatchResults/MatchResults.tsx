import type { Ref } from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MatchReason } from '@/components/molecules/MatchReason/MatchReason';
import { MATCH_COPY } from '@/lib/copy/onboarding';
import { basedOnLine, reasonLine } from '@/lib/utils/matchReason';
import type { AppError, Mentor } from '@/types/mentor';
import type { MatchBasis, MentorMatch } from '@/types/onboarding';
import { MentorCard } from '../MentorCard/MentorCard';
import styles from './MatchResults.module.css';

export type MatchResultsProps = {
  matches: MentorMatch[];
  /** False: nobody matches on study country or degree, so these are the closest. */
  exact: boolean;
  basis: MatchBasis | null;
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
  onEdit: () => void;
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
 * "Your top 2 mentor matches" (Mentee Onboarding v5.dc.html, `isMatches`):
 * loading, error, empty and content, error checked before empty. Each card
 * carries its one-line "why". Props only; the page fetches.
 */
export function MatchResults({ headingRef, ...p }: MatchResultsProps) {
  const { matches } = p;
  const [title, sub] = p.isLoading
    ? [MATCH_COPY.loadingTitle, MATCH_COPY.loadingSub]
    : p.error
      ? [MATCH_COPY.errorPageTitle, null]
      : matches.length === 0
        ? [MATCH_COPY.errorPageTitle, null]
        : !p.exact
          ? [MATCH_COPY.noExactTitle, MATCH_COPY.noExactSub]
          : [MATCH_COPY.title(matches.length), MATCH_COPY.sub];
  const basedOn = (p.basis && basedOnLine(p.basis)) ?? MATCH_COPY.basedOnFallback;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          {title}
        </h1>
        {sub && <p className={styles.sub}>{sub}</p>}
      </header>

      <div className={styles.basis}>
        <span>{basedOn}</span>
        <button type="button" className={styles.edit} onClick={p.onEdit}>
          {MATCH_COPY.edit}
        </button>
      </div>

      {p.isLoading ? (
        <div role="status" aria-label={MATCH_COPY.loadingLabel} className={styles.grid}>
          <MatchSkeleton />
          <MatchSkeleton />
        </div>
      ) : p.error ? (
        <div className={styles.error}>
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
          illustration="search-results"
          title={MATCH_COPY.emptyTitle}
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
                <li key={mt.mentor.id} className={styles.item}>
                  <MatchReason
                    line={reasonLine(mt.reasons, {
                      level: mt.level,
                      studyCountry: mt.studyCountry,
                    })}
                  />
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
                </li>
              );
            })}
          </ul>
          {matches.length === 1 && <p className={styles.oneNote}>{MATCH_COPY.oneNote}</p>}
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
