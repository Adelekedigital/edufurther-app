import { ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MentorSuggestions } from '@/components/organisms/MentorSuggestions/MentorSuggestions';
import type { Mentor, Remote, SimilarMentor } from '@/types/mentor';
import styles from './MentorProfileScreen.module.css';
import { suggestionsLine } from './suggestions';

type ProfileMissingProps = {
  similar: Remote<SimilarMentor[]>;
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
 * the page on; without (none, or the list failed), "Explore mentors" does.
 */
export function ProfileMissing({
  similar,
  onBook,
  timeZone,
  offline,
  bookBlocked,
  canBook,
}: ProfileMissingProps) {
  const suggest = similar.isLoading || !!similar.data?.length;
  return suggest ? (
    <div className={styles.missing}>
      <EmptyState
        illustration="search-results"
        size={96}
        headingLevel={1}
        title="This mentor profile isn’t available"
        description="The link may be out of date, or the profile isn’t public right now."
      />
      <MentorSuggestions
        title="Mentors with similar expertise"
        subtitle={suggestionsLine(similar.data ?? [])}
        mentors={similar.data?.map((x) => x.mentor) ?? null}
        loading={similar.isLoading}
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
