'use client';

import { useId } from 'react';
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
      <LanguageChips
        label={C.guideTitle}
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
    </section>
  );
}
