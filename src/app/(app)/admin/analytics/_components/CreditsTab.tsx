import { KpiCard } from '@/components/molecules/KpiCard/KpiCard';
import type { Credits } from '@/lib/api/data/adminAnalytics';
import { CREDIT_SOURCES, CREDITS } from '@/lib/copy/adminAnalytics';
import { formatRate, shareOf } from '@/lib/utils/analytics';
import { formatCount } from '@/lib/utils/format';
import { cardGrid, cellStrong, DataTable, Panel, Section } from './parts';

/** Nothing moved in the window: no credit granted, spent, refunded or expired. */
export const isCreditsEmpty = (d: Credits) =>
  d.flow.granted + d.flow.spent + d.flow.refunded + d.flow.expired === 0 &&
  d.bySource.every((r) => r.granted + r.spent + r.refunded + r.expired === 0);

const pctOf = (part: number, whole: number) => formatRate(Math.round(shareOf(part, whole)));

/**
 * Credits (Admin Analytics.dc.html `show.credits`): what was granted, spent,
 * refunded and expired, then the same by where the credits came from. No
 * change lines (the design draws none) and no red highlight (founder, 9 Nov).
 */
export function CreditsTab({ data }: { data: Credits }) {
  const { flow } = data;
  const cards = [
    { key: 'granted', value: flow.granted, note: CREDITS.grantedNote },
    { key: 'spent', value: flow.spent, note: CREDITS.ofGranted(pctOf(flow.spent, flow.granted)) },
    { key: 'refunded', value: flow.refunded, note: CREDITS.refundedNote },
    {
      key: 'expired',
      value: flow.expired,
      note: CREDITS.ofGranted(pctOf(flow.expired, flow.granted)),
    },
  ] as const;
  const c = CREDITS.columns;
  return (
    <Section title={CREDITS.heading} source="db">
      <div className={cardGrid}>
        {cards.map((k) => (
          <KpiCard
            key={k.key}
            size="sm"
            label={CREDITS.flow[k.key]}
            value={formatCount(k.value)}
            note={k.note}
          />
        ))}
      </div>
      <Panel title={CREDITS.tableHeading}>
        <DataTable
          label={CREDITS.tableLabel}
          template="1.2fr 1fr 1fr 1fr 1fr"
          columns={[c.source, c.granted, c.spent, c.refunded, c.expired]}
          rows={data.bySource.map((r) => ({
            key: r.source,
            cells: [
              CREDIT_SOURCES[r.source] ?? r.source,
              formatCount(r.granted),
              formatCount(r.spent),
              formatCount(r.refunded),
              // Expired is a share of that source's own grants.
              <span key="e" className={cellStrong}>
                {pctOf(r.expired, r.granted)}
              </span>,
            ],
          }))}
        />
      </Panel>
    </Section>
  );
}
