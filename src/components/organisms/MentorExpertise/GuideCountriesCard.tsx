'use client';

import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import {
  LanguageChips,
  type LanguageOption,
} from '@/components/molecules/LanguageChips/LanguageChips';
import { MENTOR_EXPERTISE_COPY as C } from '@/lib/copy/mentorSettings';
import { cx } from '@/lib/utils/cx';
import styles from './MentorExpertise.module.css';

type GuideCountriesCardProps = {
  /** The design's common countries, as chips in its order. */
  common: LanguageOption[];
  selected: LanguageOption[];
  onToggle: (country: LanguageOption) => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: LanguageOption[];
  status: 'loading' | 'error' | 'ready';
  /** At the limit (8): unpicked chips and the adder are disabled. */
  full: boolean;
  /** The country catalog didn't load: said in the group, with Try again. */
  catalogFailed?: { onRetry: () => void; at?: number };
  /** The saved countries didn't load: said in the card, with Try again. */
  readFailed?: { onRetry: () => void };
  /** The saved countries are on their way. */
  loading?: boolean;
};

/**
 * "Where can you guide mentees to?" (Mentor Settings.dc.html `guideTo`):
 * country chips, then "Add another country", which searches the catalog
 * (a country is saved by its catalog id). Saves with the page's bar.
 */
export function GuideCountriesCard({
  common,
  selected,
  onToggle,
  query,
  onQueryChange,
  results,
  status,
  full,
  catalogFailed,
  readFailed,
  loading = false,
}: GuideCountriesCardProps) {
  const id = useId();
  return (
    <section className={cx(styles.card, styles.padded, styles.guide)} aria-labelledby={id}>
      <span className={styles.headText}>
        <h2 id={id} tabIndex={-1} className={styles.title}>
          {C.guideTitle}
        </h2>
        <span id={`${id}-sub`} className={styles.sub}>
          {C.guideSub}
        </span>
      </span>
      {readFailed ? (
        <div className={styles.failedRead} role="alert">
          <span className={styles.sub}>{C.loadError}</span>
          <Button variant="secondary-outlined" size="medium" onClick={readFailed.onRetry}>
            {C.retry}
          </Button>
        </div>
      ) : loading ? (
        <div className={styles.chipsLoading} aria-hidden>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="110px" height="40px" radius="md" />
          ))}
        </div>
      ) : (
        <LanguageChips
          label={C.guideGroupLabel}
          focusKey="guide"
          common={common}
          selected={selected}
          onToggle={onToggle}
          query={query}
          onQueryChange={onQueryChange}
          results={results}
          status={status}
          full={full}
          describedBy={`${id}-sub`}
          commonFailed={
            catalogFailed
              ? {
                  text: C.countrySearchFailed,
                  retry: C.retry,
                  onRetry: catalogFailed.onRetry,
                  at: catalogFailed.at,
                }
              : undefined
          }
          copy={{
            add: C.addCountry,
            addButton: C.add,
            cancel: C.cancel,
            placeholder: C.addCountryPlaceholder,
            searching: C.searchingCountries,
            searchFailed: C.countrySearchFailed,
            noMatch: C.noCountryMatch,
          }}
        />
      )}
    </section>
  );
}
