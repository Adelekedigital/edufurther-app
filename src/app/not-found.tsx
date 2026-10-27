import { ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import styles from './not-found.module.css';

// PROVISIONAL copy — no 404 design yet. Unbuilt screens land here, and so
// does anyone but an admin opening /admin. The same EmptyState as the
// profile's "isn't available" page without suggestions: the page's h1, one
// large "Explore mentors".
export default function NotFound() {
  return (
    <main className={styles.page}>
      <EmptyState
        illustration="search-results"
        headingLevel={1}
        title="We couldn’t find that page"
        description="It may have moved, or it isn’t ready yet."
        actions={
          <ButtonLink href="/explore" size="large">
            Explore mentors
          </ButtonLink>
        }
      />
    </main>
  );
}
