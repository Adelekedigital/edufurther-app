'use client';

import { useState, type CSSProperties } from 'react';
import { KpiCard } from '@/components/molecules/KpiCard/KpiCard';
import { SegmentedControl } from '@/components/molecules/SegmentedControl/SegmentedControl';
import type { Growth } from '@/lib/api/data/adminAnalytics';
import { GROWTH, STAGES } from '@/lib/copy/adminAnalytics';
import { changeWhen, formatRate } from '@/lib/utils/analytics';
import { todayIn } from '@/lib/utils/calendar';
import { formatCount, formatDay } from '@/lib/utils/format';
import {
  Bar,
  BarRows,
  cardGrid,
  cellBar,
  DataTable,
  kpiTrend,
  Panel,
  Section,
  TwoCol,
} from './parts';
import { mixRows, monthBars, steps } from './tabModels';
import styles from './tabs.module.css';

type Split = 'source' | 'channel';
type Mix = 'topic' | 'stage';

/** Nothing happened: no sign-up, invite or completed session in the window, and no month with members. */
export const isGrowthEmpty = (d: Growth) =>
  (d.signups.all.value ?? 0) === 0 &&
  d.invites.invited === 0 &&
  d.completedTotal === 0 &&
  d.months.every((m) => m.count === 0);

/**
 * Growth (Admin Analytics.dc.html `show.growth`): sign-ups by role, new
 * members by source or channel, members from invites, sign-ups per month (it
 * doesn't follow the window) and completed sessions by topic or stage.
 */
export function GrowthTab({ data, compare }: { data: Growth; compare: boolean }) {
  const [split, setSplit] = useState<Split>('source');
  const [mix, setMix] = useState<Mix>('topic');

  const signups = (['all', 'mentees', 'mentors'] as const).map((k) => {
    const m = data.signups[k];
    const change = changeWhen(compare, m, 'count');
    return { k, m, change };
  });

  const splitRows = split === 'source' ? data.bySource : data.byChannel;
  const splitNames = split === 'source' ? GROWTH.sources : GROWTH.channels;
  const splitHead = split === 'source' ? GROWTH.source : GROWTH.channel;

  const iv = data.invites;
  const invites = steps([
    { key: 'invited', value: iv.invited },
    { key: 'joined', value: iv.joined },
    { key: 'qualified', value: iv.qualified },
    { key: 'firstBooking', value: iv.firstBooking },
    { key: 'firstCompleted', value: iv.firstCompleted },
  ] as const);
  const invitesNote = [
    iv.costPerCompleted !== null && GROWTH.invitesCost(iv.costPerCompleted.toFixed(1)),
    iv.topInviter && GROWTH.topInviter(iv.topInviter.name, iv.topInviter.joined),
  ]
    .filter(Boolean)
    .join(' ');

  // The chart doesn't follow the window: "so far" is this month, today.
  const current = todayIn('UTC').slice(0, 7);
  const months = monthBars(data.months, current);

  const mixSource =
    mix === 'topic'
      ? data.byTopic.map((t) => ({ key: t.key, label: t.name, count: t.count }))
      : (Object.keys(STAGES) as (keyof typeof STAGES)[]).map((key) => ({
          key,
          label: STAGES[key],
          count: data.byStage.find((s) => s.key === key)?.count ?? 0,
        }));
  const mixed = mixRows(mixSource, data.completedTotal);

  const toggle = <V extends string>(
    label: string,
    value: V,
    onChange: (v: V) => void,
    options: { value: V; label: string }[],
  ) => (
    <SegmentedControl<V>
      look="track"
      size="md"
      layout="hug"
      label={label}
      options={options}
      value={value}
      onChange={onChange}
    />
  );

  return (
    <Section title={GROWTH.heading} source="db">
      <div className={cardGrid}>
        {signups.map(({ k, m, change }) => (
          <KpiCard
            key={k}
            size="sm"
            className={k === 'all' ? styles.headline : undefined}
            label={GROWTH.signups[k]}
            value={m.value === null ? null : formatCount(m.value)}
            trend={kpiTrend(change)}
          />
        ))}
      </div>
      <TwoCol>
        <Panel
          title={GROWTH.splitHeading(split)}
          note={GROWTH.splitNote}
          aside={toggle(GROWTH.splitBy, split, setSplit, [
            { value: 'source', label: GROWTH.source },
            { value: 'channel', label: GROWTH.channel },
          ])}
        >
          {splitRows.length === 0 ? (
            <p className={styles.emptyLine}>{GROWTH.splitEmpty}</p>
          ) : (
            <DataTable
              label={GROWTH.splitHeading(split)}
              template="1.2fr 1fr 1.4fr"
              columns={[splitHead, GROWTH.newMembers, GROWTH.completedSession]}
              rows={splitRows.map((r) => ({
                key: r.key,
                cells: [
                  splitNames[r.key] ?? r.key,
                  formatCount(r.members),
                  <span key="s" className={styles.shareCell}>
                    <Bar width={r.completedShare} className={cellBar} />
                    <span className={styles.sharePct}>
                      {formatRate(Math.round(r.completedShare))}
                    </span>
                  </span>,
                ],
              }))}
            />
          )}
        </Panel>
        <Panel title={GROWTH.invitesHeading} note={invitesNote || undefined}>
          <BarRows
            variant="invites"
            rows={invites.map((s) => ({
              key: s.key,
              label: GROWTH.invites[s.key],
              width: s.width,
              tip: `${GROWTH.invites[s.key]}: ${formatCount(s.value)}`,
              value: formatCount(s.value),
            }))}
          />
        </Panel>
      </TwoCol>
      <TwoCol>
        <Panel
          title={GROWTH.monthsHeading}
          note={
            data.migrated
              ? GROWTH.migratedNote(
                  formatCount(data.migrated.count),
                  data.migrated.on ? formatDay(data.migrated.on).date : null,
                )
              : undefined
          }
        >
          <div
            role="img"
            aria-label={GROWTH.monthsLabel(months.map((m) => `${m.label} ${m.count}`).join(', '))}
            className={styles.months}
          >
            {months.map((m) => (
              <div
                key={m.month}
                className={styles.month}
                title={GROWTH.monthTip(m.label, m.count, m.soFar)}
              >
                <span className={styles.monthCount}>{formatCount(m.count)}</span>
                <span className={styles.monthBar} style={{ '--share': m.share } as CSSProperties} />
                <span className={styles.monthLabel}>{m.label}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title={GROWTH.mixHeading(mix)}
          note={mix === 'topic' ? GROWTH.topicNote : GROWTH.stageNote}
          aside={toggle(GROWTH.groupBy, mix, setMix, [
            { value: 'topic', label: GROWTH.topic },
            { value: 'stage', label: GROWTH.stage },
          ])}
        >
          <BarRows
            variant="mix"
            rows={mixed.map((r) => ({
              key: r.key,
              label: r.label,
              width: r.width,
              tip: GROWTH.mixTip(r.label, r.count, data.completedTotal),
              value: formatRate(r.pct),
            }))}
          />
        </Panel>
      </TwoCol>
    </Section>
  );
}
