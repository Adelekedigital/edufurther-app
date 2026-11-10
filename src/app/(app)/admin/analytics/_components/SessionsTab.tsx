import { KpiCard } from '@/components/molecules/KpiCard/KpiCard';
import type { Sessions } from '@/lib/api/data/adminAnalytics';
import { SESSIONS } from '@/lib/copy/adminAnalytics';
import { MISSED_REASON_COPY } from '@/lib/copy/session';
import {
  changeWhen,
  formatReplyHours,
  formatRate,
  shareOf,
  type ChangeKind,
} from '@/lib/utils/analytics';
import { formatCount, formatRating } from '@/lib/utils/format';
import { BarRows, ChangeText, kpiTrend, orNoData, Panel, Section, TwoCol } from './parts';
import styles from './SessionsTab.module.css';

/**
 * Nothing to read: every KPI and guardrail is empty or 0. A week with no new
 * request can still have sessions completed and reviewed in it.
 */
export const isSessionsEmpty = (d: Sessions) =>
  d.outcomes.requests === 0 &&
  Object.values(d.kpis).every((m) => !m.value) &&
  Object.values(d.guardrails).every((m) => !m.value);

type Kpi = {
  key: keyof typeof SESSIONS.kpis;
  kind: ChangeKind;
  upIsGood: boolean;
  format: (n: number) => string;
};

/** The eight KPIs, in the design's order, and how each reads and moves. */
const KPIS: Kpi[] = [
  { key: 'requests', kind: 'count', upIsGood: true, format: formatCount },
  { key: 'acceptanceRate', kind: 'rate', upIsGood: true, format: formatRate },
  { key: 'medianReplyHours', kind: 'count', upIsGood: false, format: formatReplyHours },
  { key: 'showUpRate', kind: 'rate', upIsGood: true, format: formatRate },
  { key: 'repeatBookingRate', kind: 'rate', upIsGood: true, format: formatRate },
  // A rating moves relatively, as the design's sample does ("+2.1%").
  { key: 'averageRating', kind: 'count', upIsGood: true, format: formatRating },
  { key: 'reviewRate', kind: 'rate', upIsGood: true, format: formatRate },
  { key: 'reports', kind: 'abs', upIsGood: false, format: formatCount },
];

const OUTCOMES = ['completed', 'cancelled', 'expired', 'noShow', 'declined'] as const;

const GUARDRAILS = ['noShowRate', 'requestExpiryRate', 'creditExpiryRate'] as const;

const reasonLabel = (code: string) =>
  MISSED_REASON_COPY.options.find((o) => o.value === code)?.label ?? code;

/**
 * Sessions (Admin Analytics.dc.html `show.sessions`): eight KPIs, how the
 * window's requests ended, and the three guardrails (lower is better).
 */
export function SessionsTab({ data, compare }: { data: Sessions; compare: boolean }) {
  const o = data.outcomes;
  const reason = data.topNoShowReason;
  return (
    <Section title={SESSIONS.heading} source="db">
      <div className={styles.kpis}>
        {KPIS.map((k) => {
          const m = data.kpis[k.key];
          const c = changeWhen(compare, m, k.kind, k.upIsGood);
          return (
            <KpiCard
              key={k.key}
              size="sm"
              label={SESSIONS.kpis[k.key]}
              value={m.value === null ? null : k.format(m.value)}
              trend={kpiTrend(c)}
            />
          );
        })}
      </div>
      <TwoCol>
        <Panel
          title={SESSIONS.outcomesHeading}
          note={
            <>
              {SESSIONS.outcomesNote}
              {reason &&
                ` ${SESSIONS.topNoShow(reasonLabel(reason.reason), formatRate(Math.round(reason.share)))}`}
            </>
          }
        >
          <BarRows
            variant="outcomes"
            rows={OUTCOMES.map((key) => {
              const pct = Math.round(shareOf(o[key], o.requests));
              const label = SESSIONS.outcomes[key];
              return {
                key,
                label,
                width: pct,
                value: formatRate(pct),
                muted: key !== 'completed',
                tip: SESSIONS.outcomeTip(label, formatRate(pct), formatCount(o[key])),
              };
            })}
          />
        </Panel>
        <Panel title={SESSIONS.guardrailsHeading} hint={SESSIONS.guardrailsHint} region>
          {GUARDRAILS.map((key) => {
            const m = data.guardrails[key];
            const c = changeWhen(compare, m, 'rate', false);
            return (
              <div key={key} className={styles.guard}>
                <span className={styles.guardText}>
                  <span className={styles.guardLabel}>{SESSIONS.guardrails[key]}</span>
                  {c && (
                    // A flat move already reads "No change": no verdict after it.
                    <ChangeText
                      change={c}
                      arrow
                      suffix={c.tone === 'flat' ? undefined : SESSIONS.verdict[c.tone]}
                    />
                  )}
                </span>
                <span className={styles.guardValue}>{orNoData(m.value, formatRate)}</span>
              </div>
            );
          })}
        </Panel>
      </TwoCol>
    </Section>
  );
}
