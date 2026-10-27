import { KpiCard } from '@/components/molecules/KpiCard/KpiCard';
import type { Kpi } from '@/lib/api/data/dashboard';
import styles from './KpiGrid.module.css';

/**
 * Mentor Dashboard v2 KPI strip — the four active-mentor figures, each a shared
 * KpiCard with the metric's info tooltip and the design's trend row (the ↑/↓
 * delta over a fixed window). Its row is held by a placeholder while the
 * windowed stats load, so the line arriving doesn't shift the page.
 */
export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className={styles.grid}>
      {kpis.map((k) => (
        <KpiCard
          key={k.key}
          label={k.label}
          value={k.value}
          unit={k.unit}
          info={k.info}
          trend={k.trend}
          trendPending={k.trendPending}
        />
      ))}
    </div>
  );
}
