import { KpiCard } from '@/components/molecules/KpiCard/KpiCard';
import type { MentorSummary } from '@/lib/api/data/admin';
import type { MentorTab } from '@/lib/api/data/adminMentors';
import { MENTOR_CARDS, MENTOR_TAB_LABELS } from '@/lib/copy/adminMentors';
import styles from './MentorSummaryCards.module.css';

/**
 * The three summary cards (Admin.dc.html `mKpis`), the same on every tab. Each
 * is a button that opens its tab; no selected state. Null while the summary
 * loads or failed: the cards wait rather than show zeros.
 */
export function MentorSummaryCards({
  summary,
  onOpen,
}: {
  summary: MentorSummary | null;
  onOpen: (tab: MentorTab) => void;
}) {
  if (!summary) return null;
  const waiting = summary.counts.applications;
  const longest = waiting ? summary.longestWaitDays : null;
  const cards = [
    {
      key: 'waiting',
      tab: 'applications' as const,
      label: MENTOR_CARDS.waiting.label,
      value: waiting,
      note: MENTOR_CARDS.waiting.note(longest),
      red: (longest ?? 0) >= 5,
    },
    {
      key: 'approved',
      tab: 'approved' as const,
      label: MENTOR_CARDS.approved.label,
      value: summary.counts.approved,
      note: MENTOR_CARDS.approved.note(summary.averageShowUp),
      red: false,
    },
    {
      key: 'atRisk',
      tab: 'approved' as const,
      label: MENTOR_CARDS.atRisk.label,
      value: summary.atRisk,
      note: MENTOR_CARDS.atRisk.note,
      red: summary.atRisk > 0,
    },
  ];
  return (
    <div className={styles.grid}>
      {cards.map((c) => (
        <KpiCard
          key={c.key}
          size="lg"
          label={c.label}
          value={String(c.value)}
          valueTone={c.red ? 'danger' : undefined}
          trend={{ text: c.note, tone: 'neutral' }}
          onClick={() => onOpen(c.tab)}
          ariaLabel={MENTOR_CARDS.aria(c.label, c.value, MENTOR_TAB_LABELS[c.tab])}
        />
      ))}
    </div>
  );
}
