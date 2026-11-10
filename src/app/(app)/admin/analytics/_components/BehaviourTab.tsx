'use client';

import { useId } from 'react';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
import { Select } from '@/components/atoms/Select/Select';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Notice } from '@/components/molecules/Notice/Notice';
import { RadioChips } from '@/components/molecules/RadioChips/RadioChips';
import {
  isFunnelName,
  isUpstreamDown,
  type Behaviour,
  type Funnel,
  type FunnelName,
} from '@/lib/api/data/adminAnalytics';
import {
  ANALYTICS_STATES,
  BEHAVIOUR,
  EVENT_CARDS,
  FUNNEL_COPY,
  NO_DATA,
} from '@/lib/copy/adminAnalytics';
import { formatRate } from '@/lib/utils/analytics';
import { formatCount } from '@/lib/utils/format';
import { AdminLoadError } from '../../_components/AdminLoadError';
import { BarRows, Section } from './parts';
import { steps } from './tabModels';
import { TabState } from './TabState';
import styles from './BehaviourTab.module.css';

/** What a tab needs of one query: its state, its data, why it failed, and a retry. */
export type TabQuery<T> = {
  status: 'loading' | 'error' | 'ready';
  data: T | undefined;
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
};

const FUNNEL_NAMES = Object.keys(FUNNEL_COPY) as FunnelName[];

/** The replay list opens only on an https address the server sent. */
export function safeReplayUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Each step: its bar against the first step, and how many dropped since the step before. */
export function funnelRows(funnel: Funnel) {
  return steps(funnel).map((s, i) => {
    // After an empty step nobody could drop.
    const drop =
      s.conversion === null || funnel[i - 1]!.value === 0 ? 0 : Math.max(0, 100 - s.conversion);
    return {
      key: s.key,
      label: funnel[i]!.label,
      count: formatCount(s.value),
      width: s.width,
      drop: i === 0 ? BEHAVIOUR.start : BEHAVIOUR.dropped(drop),
    };
  });
}

/** The seven event cards' rows, in the design's order. */
export function eventCards(b: Behaviour) {
  const E = EVENT_CARDS;
  return [
    {
      key: 'login',
      ...E.login,
      rows: [
        [E.login.attempts, formatCount(b.login.attempts)],
        [E.login.failed, formatRate(b.login.failedRate)],
        [E.login.failedMigrated, formatRate(b.login.failedMigratedRate)],
      ],
    },
    {
      key: 'search',
      ...E.search,
      rows: [
        [E.search.searches, formatCount(b.search.searches)],
        [E.search.noResults, formatRate(b.search.noResultRate)],
        [E.search.views, formatCount(b.search.profileViews)],
      ],
    },
    {
      key: 'views',
      ...E.views,
      rows: b.profileViewsBySource.map((v) => [v.label, formatRate(v.share)]),
    },
    {
      key: 'joining',
      ...E.joining,
      rows: [
        [E.joining.clicked, formatCount(b.joining.clicked)],
        [E.joining.failed, formatCount(b.joining.failed)],
        [
          E.joining.median,
          b.joining.medianMinutesBefore === null
            ? NO_DATA
            : E.joining.minutes(b.joining.medianMinutesBefore),
        ],
      ],
    },
    {
      key: 'assist',
      ...E.assist,
      rows: [
        [E.assist.used, formatCount(b.writingAssist.used)],
        [E.assist.accepted, formatRate(b.writingAssist.acceptedRate)],
        [E.assist.discarded, formatRate(b.writingAssist.discardedRate)],
      ],
    },
    {
      key: 'app',
      ...E.app,
      rows: [
        [E.app.installed, formatCount(b.app.installed)],
        [E.app.push, E.app.ofMembers(formatRate(b.app.pushAllowedRate))],
      ],
    },
    {
      key: 'errors',
      ...E.errors,
      rows: b.errorsByScreen.slice(0, 3).map((e) => [e.route, formatCount(e.count)]),
    },
  ] as { key: string; title: string; q: string; rows: [string, string][] }[];
}

/**
 * Behaviour (Admin Analytics.dc.html `show.funnels`): a funnel picked by chip,
 * broken down by the shared Select, then the event cards and the link to
 * PostHog's replays. All of it reads PostHog: when PostHog isn't answering, a
 * warning says so and the rest is hidden (every database card elsewhere still
 * loads).
 */
export function BehaviourTab({
  funnel,
  by,
  onFunnel,
  onBy,
  funnelQuery,
  eventsQuery,
}: {
  funnel: FunnelName;
  by: string;
  onFunnel: (name: FunnelName) => void;
  onBy: (by: string) => void;
  funnelQuery: TabQuery<Funnel>;
  eventsQuery: TabQuery<Behaviour>;
}) {
  const byId = useId();
  const down = [funnelQuery, eventsQuery].some(
    (q) => q.status === 'error' && isUpstreamDown(q.error),
  );
  const copy = FUNNEL_COPY[funnel];
  const replays = safeReplayUrl(eventsQuery.data?.replaysUrl);

  return (
    <Section title={BEHAVIOUR.heading} source="posthog" label="Funnels">
      {down ? (
        <Notice tone="warning">{BEHAVIOUR.down}</Notice>
      ) : (
        <>
          <div className={styles.funnelCard}>
            <div className={styles.controls}>
              <RadioChips
                label={BEHAVIOUR.funnelLabel}
                look="dark"
                required={false}
                options={FUNNEL_NAMES.map((n) => ({ value: n, label: FUNNEL_COPY[n].label }))}
                value={funnel}
                onChange={(v) => isFunnelName(v) && v !== funnel && onFunnel(v)}
              />
              <div className={styles.by}>
                <span id={byId} className={styles.byLabel}>
                  {copy.byLabel}
                </span>
                <Select
                  aria-labelledby={byId}
                  density="compact"
                  radius="sm"
                  options={copy.by.map(([value, label]) => ({ value, label }))}
                  value={by}
                  onChange={(e) => onBy(e.target.value)}
                />
              </div>
            </div>
            <FunnelBody name={funnel} query={funnelQuery} />
          </div>
          <TabState
            status={eventsQuery.status}
            empty={false}
            onRetry={eventsQuery.onRetry}
            retrying={eventsQuery.retrying}
          >
            {() => (
              <>
                <div className={styles.cards}>
                  {eventCards(eventsQuery.data!).map((c) => (
                    <div key={c.key} className={styles.card}>
                      <div className={styles.cardHead}>
                        <h3 className={styles.cardTitle}>{c.title}</h3>
                        <span className={styles.cardQ}>{c.q}</span>
                      </div>
                      {c.rows.map(([k, v]) => (
                        <div key={k} className={styles.row}>
                          <span className={styles.rowLabel}>{k}</span>
                          <span className={styles.rowValue}>{v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {replays && (
                  <span className={styles.replays}>
                    {BEHAVIOUR.replays}{' '}
                    <ExternalLink
                      href={replays}
                      label={BEHAVIOUR.replaysLink}
                      className={styles.replaysLink}
                    >
                      {BEHAVIOUR.replaysLink} <span aria-hidden>↗</span>
                    </ExternalLink>
                  </span>
                )}
              </>
            )}
          </TabState>
        </>
      )}
    </Section>
  );
}

/** The funnel's steps, or its own loading and failed states inside the card. */
function FunnelBody({ name, query }: { name: FunnelName; query: TabQuery<Funnel> }) {
  const copy = FUNNEL_COPY[name];
  if (query.status === 'loading') {
    return (
      <div
        className={styles.loading}
        role="status"
        aria-busy="true"
        aria-label={ANALYTICS_STATES.loading}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height="28px" radius="sm" />
        ))}
      </div>
    );
  }
  if (query.status === 'error') {
    return (
      <AdminLoadError
        illustration="dashboard"
        title={ANALYTICS_STATES.errorTitle}
        body={ANALYTICS_STATES.errorBody}
        retryLabel={ANALYTICS_STATES.retry}
        onRetry={query.onRetry}
        retrying={query.retrying}
      />
    );
  }
  if (!query.data!.length || query.data![0]!.value === 0) {
    // Nobody started this funnel in the window: the page's empty state, in the card.
    return (
      <EmptyState
        illustration="dashboard"
        size={120}
        headingLevel={3}
        title={ANALYTICS_STATES.emptyTitle}
        description={ANALYTICS_STATES.emptyBody}
      />
    );
  }
  const rows = funnelRows(query.data!);
  return (
    <>
      <BarRows
        label={BEHAVIOUR.funnelAria(
          copy.label,
          rows.map((r) => `${r.label} ${r.count}`).join(', '),
        )}
        variant="funnel"
        rows={rows.map((r) => ({
          key: r.key,
          label: r.label,
          width: r.width,
          tip: BEHAVIOUR.stepTip(r.label, r.count),
          value: (
            <span className={styles.step}>
              <strong className={styles.stepCount}>{r.count}</strong>
              <span className={styles.drop}>{r.drop}</span>
            </span>
          ),
        }))}
      />
      <div className={styles.foot}>
        <span>{copy.note}</span>
        <span>{BEHAVIOUR.refreshed}</span>
      </div>
    </>
  );
}
