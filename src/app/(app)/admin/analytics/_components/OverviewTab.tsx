import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { AnalyticsTab, Overview } from '@/lib/api/data/adminAnalytics';
import { FEATURES, OVERVIEW } from '@/lib/copy/adminAnalytics';
import { changeWhen, formatRate } from '@/lib/utils/analytics';
import { formatCount } from '@/lib/utils/format';
import { ChangeText, orNoData, SourceBadge } from './parts';
import { TrendChart } from './TrendChart';
import { sparkPath } from './trendModel';
import styles from './OverviewTab.module.css';

/**
 * Nothing to read in the window: no completed session, no one served, and no
 * feature with a number (Mentor supply is a "now" number, so a quiet week
 * still shows the cards).
 */
export const isOverviewEmpty = (d: Overview) =>
  !d.northStar.completed.value &&
  d.northStar.series.every((p) => p.value === 0) &&
  !d.subTracks.uniqueMentees.value &&
  !d.subTracks.mentorsDelivered.value &&
  d.features.every((f) => f.value?.value == null);

/**
 * Overview (Admin Analytics.dc.html `show.overview`): the platform North
 * Star with its trend and sub-tracks, then the seven feature North Stars,
 * each a button that opens its tab.
 */
export function OverviewTab({
  data,
  compare,
  windowLabel,
  onOpen,
}: {
  data: Overview;
  compare: boolean;
  windowLabel: string;
  onOpen: (tab: AnalyticsTab) => void;
}) {
  const ids = useId();
  const ns = data.northStar;
  const nsChange = changeWhen(compare, ns.completed, 'count');
  const subs = [
    { key: 'uniqueMentees', m: data.subTracks.uniqueMentees, f: formatCount },
    { key: 'mentorsDelivered', m: data.subTracks.mentorsDelivered, f: formatCount },
    {
      key: 'sessionsPerMentee',
      m: data.subTracks.sessionsPerMentee,
      f: (n: number) => n.toFixed(2),
    },
  ] as const;
  return (
    <>
      <section aria-label={OVERVIEW.eyebrow} className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.titles}>
            <span className={styles.eyebrow}>
              <Icon name="star" size={16} className={styles.star} />
              {OVERVIEW.eyebrow}
            </span>
            <h2 className={styles.heading}>
              {OVERVIEW.heading} <SourceBadge source="db" />
            </h2>
          </div>
          <span className={styles.muted}>{windowLabel}</span>
        </div>
        <div className={styles.valueRow}>
          <span className={styles.value}>{orNoData(ns.completed.value, formatCount)}</span>
          {nsChange && (
            <>
              <ChangeText change={nsChange} arrow size="sm" />
              <span className={styles.muted}>
                {OVERVIEW.vsBefore(formatCount(ns.completed.previous ?? 0))}
              </span>
            </>
          )}
        </div>
        <TrendChart series={ns.series} unit={ns.unit} compare={compare} windowLabel={windowLabel} />
        <div className={styles.subs}>
          {subs.map((s) => {
            const c = changeWhen(compare, s.m, 'count');
            return (
              <div key={s.key} className={styles.sub}>
                <span className={styles.muted}>{OVERVIEW.subTracks[s.key]}</span>
                <span className={styles.subValue}>{orNoData(s.m.value, s.f)}</span>
                {c && <ChangeText change={c} />}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label={OVERVIEW.featuresHeading} className={styles.features}>
        <div className={styles.featuresHead}>
          <h2 className={styles.heading}>{OVERVIEW.featuresHeading}</h2>
          <span className={styles.muted}>{OVERVIEW.featuresHint}</span>
        </div>
        <div className={styles.grid}>
          {data.features.map((f) => {
            const copy = FEATURES[f.key];
            const value = f.value?.value ?? null;
            const shown = orNoData(value, formatRate);
            const c = f.value ? changeWhen(compare, f.value, 'rate') : null;
            const feeds = copy.feeds && f.contribution !== null ? copy.feeds(f.contribution) : null;
            return (
              <button
                key={f.key}
                type="button"
                className={styles.feature}
                aria-label={OVERVIEW.openDetail(copy.name, shown, c?.text ?? null)}
                // The name holds the figures; the definition and the feeds line are its description.
                aria-describedby={[`${ids}-${f.key}-def`, feeds && `${ids}-${f.key}-feeds`]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onOpen(copy.opens)}
              >
                <span className={styles.featureHead}>
                  <span className={styles.featureName}>{copy.name}</span>
                  <SourceBadge source={copy.posthog ? 'posthog' : 'db'} />
                </span>
                <span id={`${ids}-${f.key}-def`} className={styles.def}>
                  {copy.def}
                </span>
                <span className={styles.featureFoot}>
                  <span className={styles.featureFigure}>
                    <span className={styles.featureValue}>{shown}</span>
                    {c && <ChangeText change={c} arrow />}
                  </span>
                  {f.spark && value !== null && (
                    <svg
                      viewBox="0 0 100 32"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                      className={styles.spark}
                    >
                      <path d={sparkPath(f.spark)} />
                    </svg>
                  )}
                </span>
                {feeds && (
                  <span id={`${ids}-${f.key}-feeds`} className={styles.feeds}>
                    {OVERVIEW.feeds(feeds)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
