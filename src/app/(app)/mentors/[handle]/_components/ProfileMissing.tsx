import { ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MentorSuggestions } from '@/components/organisms/MentorSuggestions/MentorSuggestions';
import { FREE_SOON } from '@/lib/api/data/freeSoon';
import { SIMILAR_SHOWN } from '@/lib/api/data/similar';
import { NOT_FOUND_COPY } from '@/lib/copy/profile';
import type { Mentor, Remote, SimilarMentor } from '@/types/mentor';
import styles from './MentorProfileScreen.module.css';
import { suggestionsLine } from './suggestions';

type ProfileMissingProps = {
  similar: Remote<SimilarMentor[]>;
  /** Asked for once `similar` comes back empty: an unknown address. */
  freeSoon: Remote<Mentor[]>;
  onBook: (m: Mentor) => void;
  timeZone: string;
  offline: boolean;
  bookBlocked: string | null;
  canBook: boolean;
};

/**
 * The "isn't available" page: design reply #34, then Mentor Profile.dc.html
 * notFound (#38). 404 is "not found or not public", indistinguishable on
 * purpose: the copy doesn't guess which. With mentors to suggest, they carry
 * the page on: similar ones for a mentor we know (a hidden profile), else
 * ones with open times this week (an unknown address). Without either (none,
 * or the lists failed), "Explore mentors" does.
 */
export function ProfileMissing({
  similar,
  freeSoon,
  onBook,
  timeZone,
  offline,
  bookBlocked,
  canBook,
}: ProfileMissingProps) {
  // Rendered only for a profile that isn't found (the screen's branch; a
  // loading or failed profile has its own state), so `similar` is this
  // handle's list, asked for because of the 404.
  const bySimilar = similar.isLoading || !!similar.data?.length;
  const bySoon = !bySimilar && (freeSoon.isLoading || !!freeSoon.data?.length);
  const shown = similar.data?.slice(0, SIMILAR_SHOWN.missing) ?? [];
  return bySimilar || bySoon ? (
    <div className={styles.missing}>
      <EmptyState
        illustration="search-results"
        size={96}
        headingLevel={1}
        title="This mentor profile isn’t available"
        description="The link may be out of date, or the profile isn’t public right now."
      />
      <MentorSuggestions
        {...(bySimilar
          ? {
              title: NOT_FOUND_COPY.similarTitle,
              subtitle: suggestionsLine(shown),
              mentors: similar.data ? shown.map((x) => x.mentor) : null,
              loading: similar.isLoading,
              expected: SIMILAR_SHOWN.missing,
            }
          : {
              title: NOT_FOUND_COPY.freeSoonTitle,
              subtitle: NOT_FOUND_COPY.freeSoonSub,
              mentors: freeSoon.data,
              loading: freeSoon.isLoading,
              expected: FREE_SOON.shown,
            })}
        exploreHref="/explore"
        onBook={onBook}
        timeZone={timeZone}
        offline={offline}
        bookBlocked={bookBlocked}
        canBook={canBook}
      />
    </div>
  ) : (
    <div className={styles.state}>
      <EmptyState
        illustration="search-results"
        headingLevel={1}
        title="This mentor profile isn’t available"
        description="The link may be out of date, or the profile isn’t public. You can find other mentors who’ve done the same path."
        actions={
          <ButtonLink href="/explore" size="large">
            Explore mentors
          </ButtonLink>
        }
      />
    </div>
  );
}
