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
  type FunnelFigure,
  type FunnelName,
  type FunnelStep,
} from '@/lib/api/data/adminAnalytics';
import {
  ANALYTICS_STATES,
  BEHAVIOUR,
  EVENT_CARDS,
  FUNNEL_COPY,
  PROFILE_VIEW_SOURCES,
} from '@/lib/copy/adminAnalytics';
import { formatRate } from '@/lib/utils/analytics';
import { formatCount } from '@/lib/utils/format';
import { AdminLoadError } from '../../_components/AdminLoadError';
import { BarRows, orNoData, Section } from './parts';
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
export function safeReplayUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Each step: its bar against the first step, and how many dropped since the
 * step before. A step nothing tracks (null) reads "No data" with no bar, and
 * no drop is claimed into or out of it.
 */
export function funnelRows(funnel: Omit<FunnelStep, 'layer'>[]) {
  const known = steps(funnel.map((s) => ({ key: s.key, value: s.value ?? 0 })));
  return known.map((s, i) => {
    const value = funnel[i]!.value;
    const before = i === 0 ? null : funnel[i - 1]!.value;
    // After an empty step nobody could drop.
    const pct = s.conversion === null || before === 0 ? 0 : Math.max(0, 100 - s.conversion);
    return {
      key: s.key,
      label: funnel[i]!.label,
      count: orNoData(value, formatCount),
      width: value === null ? 0 : s.width,
      drop:
        i === 0 ? BEHAVIOUR.start : value === null || before === null ? '' : BEHAVIOUR.dropped(pct),
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
        [E.login.failed, orNoData(b.login.failedRate, formatRate)],
        [E.login.failedMigrated, orNoData(b.login.failedMigratedRate, formatRate)],
      ],
    },
    {
      key: 'search',
      ...E.search,
      rows: [
        [E.search.searches, formatCount(b.search.searches)],
        [E.search.noResults, orNoData(b.search.noResultRate, formatRate)],
        [E.search.views, formatCount(b.search.profileViews)],
      ],
    },
    {
      key: 'views',
      ...E.views,
      rows: b.profileViewsBySource.map((v) => [
        // A source newer than this list keeps its key: never a second "Other" row.
        PROFILE_VIEW_SOURCES[v.source] ?? v.source,
        orNoData(v.share, formatRate),
      ]),
    },
    {
      key: 'joining',
      ...E.joining,
      rows: [
        [E.joining.clicked, formatCount(b.joining.clicked)],
        [E.joining.failed, formatCount(b.joining.failed)],
        [E.joining.median, orNoData(b.joining.medianMinutesBefore, E.joining.minutes)],
      ],
    },
    {
      key: 'assist',
      ...E.assist,
      rows: [
        [E.assist.used, formatCount(b.writingAssist.used)],
        [E.assist.accepted, orNoData(b.writingAssist.acceptedRate, formatRate)],
        [E.assist.discarded, orNoData(b.writingAssist.discardedRate, formatRate)],
      ],
    },
    {
      key: 'app',
      ...E.app,
      rows: [
        [E.app.installed, formatCount(b.app.installed)],
        [E.app.push, orNoData(b.app.pushAllowedRate, (n) => E.app.ofMembers(formatRate(n)))],
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
  const { steps: all, figures } = query.data!;
  // Nobody started it, or nothing tracks its first step.
  if (!all.length || !all[0]!.value) {
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
  // One run of rows, so drop-off carries on from the milestones into the outcome.
  const rows = funnelRows(all);
  const primary = rows.filter((_, i) => all[i]!.layer !== 'secondary');
  const secondary = rows.filter((_, i) => all[i]!.layer === 'secondary');
  const bars = (list: typeof rows, label: string) => (
    <BarRows
      label={label}
      variant="funnel"
      rows={list.map((r) => ({
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
  );
  const spoken = (list: typeof rows) => list.map((r) => `${r.label} ${r.count}`).join(', ');
  return (
    <>
      {bars(primary, BEHAVIOUR.funnelAria(copy.label, spoken(primary)))}
      {secondary.length > 0 && (
        <>
          <p className={styles.layer} aria-hidden="true">
            {BEHAVIOUR.outcome}
          </p>
          {bars(secondary, BEHAVIOUR.outcomeLabel(copy.label, spoken(secondary)))}
        </>
      )}
      {figures.length > 0 && <Figures name={copy.label} figures={figures} />}
      <div className={styles.foot}>
        <span>{copy.note}</span>
        <span>{BEHAVIOUR.refreshed}</span>
      </div>
    </>
  );
}

const ONE_DECIMAL = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** A figure as read: "2.5 days", "41.7%", or "No data". */
export function figureValue(f: Pick<FunnelFigure, 'value' | 'unit'>): string {
  return orNoData(f.value, (n) =>
    f.unit === 'days'
      ? BEHAVIOUR.days(ONE_DECIMAL.format(n))
      : BEHAVIOUR.percent(ONE_DECIMAL.format(n)),
  );
}

/** The numbers beside the funnel (funnels v2): days to bookable, adoption, review time. */
function Figures({ name, figures }: { name: string; figures: FunnelFigure[] }) {
  return (
    <dl className={styles.figures} aria-label={BEHAVIOUR.figuresLabel(name)}>
      {figures.map((f) => (
        <div key={f.key} className={styles.figure}>
          <dt>{f.label}</dt>
          <dd>{figureValue(f)}</dd>
        </div>
      ))}
    </dl>
  );
}
