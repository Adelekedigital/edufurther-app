'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { Notice } from '@/components/molecules/Notice/Notice';
import { MentorCard } from '@/components/organisms/MentorCard/MentorCard';
import type { MetMentor } from '@/lib/api/data/metMentors';
import type { Mentor, Remote } from '@/types/mentor';
import { MentorRow } from './MentorRow';
import styles from './MenteeMentorsSection.module.css';

/** Where "Choose your mentor" scrolls to (design `[data-ef-rec]`). */
export const RECOMMENDED_ID = 'mentors-for-your-goal';

/** Rows and cards shown on Home (design: "3 each"). */
export const SHOWN = 3;

/** A matched mentor for Recommended: the card plus what they match of the goal. */
export type Recommended = { mentor: Mentor; matchTopics: string[] };

type MenteeMentorsSectionProps = {
  mentors: Remote<MetMentor[]>;
  /** Matched mentors not yet met. A failed read hides Recommended, never the page. */
  recommended: { items: Recommended[]; isLoading: boolean; failed: boolean };
  /** The mentee's help areas, for "Matched to your goal: …"; null when unknown. */
  goalLine: string | null;
  /** Recommended's heading when it stands alone ("Mentors for your goal" for a new mentee). */
  recTitle?: string;
  timeZone: string;
  /** Phones: the compact card. */
  compact: boolean;
  offline: boolean;
  bookBlocked: string | null;
  onBook: (mentor: MetMentor) => void;
  onBookMentor: (mentor: Mentor) => void;
  /** Opens Mentors you've met (the screen owns it). */
  onSeeAll: () => void;
};

type Tab = 'yours' | 'rec';

/**
 * Home "Mentors" (Mentee Dashboard v2.dc.html, rebook list, rebookWith tabs):
 * "Book again" (mentors met who can be booked now, 3 at most) and
 * "Recommended" (matches not yet met, 3 at most) as tabs. With nobody to book
 * again the tabs go and Recommended stands alone under its heading; with no
 * matches, Book again stands alone. Every Book opens the booking flow in place.
 */
export function MenteeMentorsSection(p: MenteeMentorsSectionProps) {
  const ids = useId();
  const [tab, setTab] = useState<Tab>('yours');
  const met = p.mentors.data ?? [];
  const eligible = met.filter((m) => m.bookability === 'open').slice(0, SHOWN);
  const rec = p.recommended;
  const recShown = rec.items.slice(0, SHOWN);

  const metSettled = !p.mentors.isLoading && !p.mentors.error;
  // Book again is there unless it's settled with nobody bookable; an error keeps it (with a retry).
  const hasBookAgain = !metSettled || eligible.length > 0;
  const hasRec = !rec.failed && (rec.isLoading || recShown.length > 0);
  if (!hasBookAgain && !hasRec) return null;
  const tabs = hasBookAgain && hasRec;
  const active: Tab = !tabs ? (hasBookAgain ? 'yours' : 'rec') : tab;

  const bookAgain = (
    <BookAgainPanel
      {...p}
      eligible={eligible}
      title={tabs ? null : 'Book again'}
      sub={
        tabs
          ? 'Pick up where you left off with a mentor you’ve met'
          : 'Mentors you’ve met, most recent first'
      }
    />
  );
  const recommended = (
    <RecommendedPanel
      {...p}
      items={recShown}
      title={tabs ? null : (p.recTitle ?? 'Recommended for you')}
    />
  );

  if (!tabs)
    return <div className={styles.solo}>{active === 'yours' ? bookAgain : recommended}</div>;

  const panel = (t: Tab) => `${ids}-${t}`;
  return (
    <section aria-labelledby={`${ids}-h`} className={styles.block}>
      <div className={styles.tabsHead}>
        <h2 id={`${ids}-h`} className={styles.title}>
          Mentors
        </h2>
        <div className={styles.tabsLine}>
          <Tabs
            label="Mentors"
            value={active}
            onChange={(v) => setTab(v as Tab)}
            items={[
              { value: 'yours', label: 'Book again', panelId: panel('yours') },
              { value: 'rec', label: 'Recommended', panelId: panel('rec') },
            ]}
          />
        </div>
      </div>
      <TabPanel id={panel('yours')} active={active === 'yours'}>
        {bookAgain}
      </TabPanel>
      <TabPanel id={panel('rec')} active={active === 'rec'}>
        {recommended}
      </TabPanel>
    </section>
  );
}

type PanelHead = { title: string | null; sub: string; action: React.ReactNode };

/** A panel's head: its own heading only when there are no tabs to name it. */
function Head({ title, sub, action }: PanelHead) {
  return (
    <div className={styles.head}>
      <div className={styles.headText}>
        {title && <h2 className={styles.title}>{title}</h2>}
        <span className={styles.sub}>{sub}</span>
      </div>
      {action}
    </div>
  );
}

function BookAgainPanel(
  p: MenteeMentorsSectionProps & { eligible: MetMentor[]; title: string | null; sub: string },
) {
  const { mentors } = p;
  return (
    <section aria-label="Book again" className={styles.section}>
      <Head
        title={p.title}
        sub={p.sub}
        action={
          <button type="button" className={styles.seeAll} onClick={p.onSeeAll}>
            See all mentors
          </button>
        }
      />
      {mentors.error ? (
        <Notice tone="neutral" icon="error" title="We couldn’t load your mentors.">
          <button type="button" className={styles.inlineAction} onClick={mentors.retry}>
            Try again
          </button>
        </Notice>
      ) : mentors.isLoading ? (
        <div className={styles.list} aria-hidden="true">
          {Array.from({ length: SHOWN }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {p.eligible.map((m) => (
            <MentorRow key={m.id} mentor={m} timeZone={p.timeZone} onBook={p.onBook} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecommendedPanel(
  p: MenteeMentorsSectionProps & { items: Recommended[]; title: string | null },
) {
  return (
    <section aria-label="Recommended mentors" id={RECOMMENDED_ID} className={styles.section}>
      <Head
        title={p.title}
        sub={p.goalLine ? `Matched to your goal: ${p.goalLine}` : 'Matched to your goal'}
        action={
          <Link href="/explore" prefetch={false} className={styles.seeAll}>
            See all
          </Link>
        }
      />
      <ul className={styles.grid} aria-busy={p.recommended.isLoading || undefined}>
        {p.recommended.isLoading
          ? Array.from({ length: SHOWN }).map((_, i) => (
              <li key={i} aria-hidden="true">
                <CardSkeleton />
              </li>
            ))
          : p.items.map((r) => (
              <li key={r.mentor.id} className={styles.cell}>
                <MentorCard
                  mentor={r.mentor}
                  matchTopics={r.matchTopics}
                  variant={p.compact ? 'compact' : 'photo'}
                  headingLevel={3}
                  timeZone={p.timeZone}
                  offline={p.offline}
                  bookBlocked={p.bookBlocked}
                  onBook={p.onBookMentor}
                />
              </li>
            ))}
      </ul>
    </section>
  );
}

/** One mentor row, loading. */
function RowSkeleton() {
  return (
    <div className={styles.skelRow}>
      <Skeleton width="48px" height="48px" radius="full" />
      <div className={styles.skelLines}>
        <Skeleton width="45%" height="14px" />
        <Skeleton width="65%" height="12px" />
        <Skeleton width="35%" height="12px" />
      </div>
      <Skeleton width="104px" height="var(--button-h-medium)" radius="md" />
    </div>
  );
}

/** One recommended card, loading. */
function CardSkeleton() {
  return (
    <div className={styles.skelCard}>
      <Skeleton height="160px" radius="lg" />
      <Skeleton width="60%" height="16px" />
      <Skeleton width="85%" height="12px" />
      <Skeleton height="40px" radius="md" />
    </div>
  );
}
