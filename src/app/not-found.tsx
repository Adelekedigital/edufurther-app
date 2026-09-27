import { ButtonLink } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import styles from './not-found.module.css';

// PROVISIONAL copy — no 404 design yet. Screens owned by other sessions
// (Home, Bookings, Messages, Settings, Mentor profile) land here until built.
export default function NotFound() {
  return (
    <main className={styles.page}>
      <EmptyState
        illustration="search-results"
        headingLevel={2}
        title="We couldn’t find that page"
        description="It may have moved, or it isn’t ready yet."
        actions={<ButtonLink href="/explore">Find a mentor</ButtonLink>}
      />
    </main>
  );
}
