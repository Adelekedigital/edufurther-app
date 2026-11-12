import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import type { AnalyticsTab, Overview } from '@/lib/api/data/adminAnalytics';
import { FEATURES, OVERVIEW } from '@/lib/copy/adminAnalytics';
import { changeWhen, formatRate, type Metric } from '@/lib/utils/analytics';
import { formatCount, formatDay } from '@/lib/utils/format';
import { ChangeText, orNoData, SourceBadge } from './parts';
import { TrendChart } from './TrendChart';
import { sparkPath } from './trendModel';
import styles from './OverviewTab.module.css';

/**
 * Nothing to read in the window: no completed session, no one served, no
 * active member, and no feature with a number (Mentor supply is a "now"
 * number, so a quiet week still shows the cards).
 */
export const isOverviewEmpty = (d: Overview) =>
  !d.northStar.completed.value &&
  d.northStar.series.every((p) => p.value === 0) &&
  !d.subTracks.uniqueMentees.value &&
  !d.subTracks.mentorsDelivered.value &&
  !d.subTracks.weeklyActive?.value &&
  !d.subTracks.monthlyActive?.value &&
  d.features.every((f) => f.value?.value == null);

/** What the Overview card shows (Admin Analytics.dc.html `metric`: ns | au). */
export type OverviewShow = 'northStar' | 'active';

type Sub = {
  key: keyof typeof OVERVIEW.subTracks;
  m: Metric | null;
  f: (n: number) => string;
  kind: 'count' | 'rate';
  /** A grey line under the change (the Active members view's role split). */
  note?: string;
};

function SubTiles({ subs, compare }: { subs: Sub[]; compare: boolean }) {
  return (
    <div className={styles.subs}>
      {subs.map((s) => {
        const c = s.m && s.m.value !== null ? changeWhen(compare, s.m, s.kind) : null;
        return (
          <div key={s.key} className={styles.sub}>
            <span className={styles.muted}>{OVERVIEW.subTracks[s.key]}</span>
            <span className={styles.subValue}>{orNoData(s.m?.value ?? null, s.f)}</span>
            {c && <ChangeText change={c} />}
            {s.note && <span className={styles.muted}>{s.note}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** "Mentees 204 · Mentors 42", or nothing when the response has no split. */
const roleSplit = (
  byRole: Overview['activeMembers']['byRole'],
  pick: 'weekly' | 'monthly',
): string | undefined => {
  const mentee = byRole?.mentee[pick].value;
  const mentor = byRole?.mentor[pick].value;
  return mentee == null || mentor == null
    ? undefined
    : OVERVIEW.active.split(formatCount(mentee), formatCount(mentor));
};

/**
 * Overview (Admin Analytics.dc.html `show.overview`): the card at the top,
 * then the seven feature North Stars, each a button that opens its tab. The
 * card's Show switch (owner pick B, 2026-11-12) swaps it between the platform
 * North Star (its trend and three sub-tracks) and Active members (weekly
 * active as the headline with its trend; weekly, monthly and stickiness
 * underneath, split by role).
 */
export function OverviewTab({
  data,
  compare,
  windowLabel,
  show = 'northStar',
  onShow,
  onOpen,
}: {
  data: Overview;
  compare: boolean;
  windowLabel: string;
  show?: OverviewShow;
  onShow: (show: OverviewShow) => void;
  onOpen: (tab: AnalyticsTab) => void;
}) {
  const ids = useId();
  const ns = data.northStar;
  const st = data.subTracks;
  const am = data.activeMembers;
  const active = show === 'active';

  const head = active
    ? {
        icon: 'group' as const,
        eyebrow: OVERVIEW.active.eyebrow,
        heading: OVERVIEW.active.heading,
        when: OVERVIEW.active.asOf(formatDay(data.to).date),
        metric: st.weeklyActive ?? { value: null, previous: null },
        unit: OVERVIEW.active.unit as string | null,
        vsBefore: OVERVIEW.active.vsBefore,
      }
    : {
        icon: 'star' as const,
        eyebrow: OVERVIEW.eyebrow,
        heading: OVERVIEW.heading,
        when: windowLabel,
        metric: ns.completed,
        unit: null,
        vsBefore: OVERVIEW.vsBefore,
      };
  const change = head.metric.value === null ? null : changeWhen(compare, head.metric, 'count');
  const subs: Sub[] = active
    ? [
        {
          key: 'weeklyActive',
          m: st.weeklyActive,
          f: formatCount,
          kind: 'count',
          note: roleSplit(am.byRole, 'weekly'),
        },
        {
          key: 'monthlyActive',
          m: st.monthlyActive,
          f: formatCount,
          kind: 'count',
          note: roleSplit(am.byRole, 'monthly'),
        },
        {
          key: 'stickiness',
          m: st.stickiness,
          f: formatRate,
          kind: 'rate',
          note: OVERVIEW.active.stickinessNote,
        },
      ]
    : [
        { key: 'uniqueMentees', m: st.uniqueMentees, f: formatCount, kind: 'count' },
        { key: 'mentorsDelivered', m: st.mentorsDelivered, f: formatCount, kind: 'count' },
        {
          key: 'sessionsPerMentee',
          m: st.sessionsPerMentee,
          f: (n) => n.toFixed(2),
          kind: 'count',
        },
      ];

  return (
    <>
      <section aria-label={head.eyebrow} className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.titles}>
            <span className={styles.eyebrow}>
              <Icon name={head.icon} size={16} className={styles.star} />
              {head.eyebrow}
            </span>
            <h2 className={styles.heading}>
              {head.heading} <SourceBadge source="db" />
            </h2>
          </div>
          <div className={styles.headEnd}>
            {/* The same select as the Behaviour tab's "Break down by". */}
            <span className={styles.show}>
              <span id={`${ids}-show`} className={styles.showLabel}>
                {OVERVIEW.show}
              </span>
              <Select
                aria-labelledby={`${ids}-show`}
                className={styles.showSelect}
                density="compact"
                radius="sm"
                options={[
                  { value: 'northStar', label: OVERVIEW.showNorthStar },
                  { value: 'active', label: OVERVIEW.showActive },
                ]}
                value={show}
                onChange={(e) => onShow(e.target.value === 'active' ? 'active' : 'northStar')}
              />
            </span>
            <span className={styles.muted}>{head.when}</span>
          </div>
        </div>
        <div className={styles.valueRow}>
          <span className={styles.value}>{orNoData(head.metric.value, formatCount)}</span>
          {head.unit && head.metric.value !== null && (
            <span className={styles.unit}>{head.unit}</span>
          )}
          {change && (
            <>
              <ChangeText change={change} arrow size="sm" />
              <span className={styles.muted}>
                {head.vsBefore(formatCount(head.metric.previous ?? 0))}
              </span>
            </>
          )}
        </div>
        {active ? (
          am.series && (
            <TrendChart
              series={am.series}
              unit={ns.unit}
              compare={compare}
              windowLabel={windowLabel}
              labels={OVERVIEW.active}
            />
          )
        ) : (
          <TrendChart
            series={ns.series}
            unit={ns.unit}
            compare={compare}
            windowLabel={windowLabel}
          />
        )}
        <SubTiles subs={subs} compare={compare} />
        {active && (
          <p className={styles.note}>
            <Icon name="info" size={16} className={styles.noteIcon} />
            {OVERVIEW.activeNote}
          </p>
        )}
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
