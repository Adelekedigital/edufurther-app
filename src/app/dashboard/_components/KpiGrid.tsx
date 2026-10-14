import { KpiCard } from '@/components/molecules/KpiCard/KpiCard';
import type { Kpi } from '@/lib/api/data/dashboard';
import styles from './KpiGrid.module.css';

/**
 * Mentor Dashboard v2 KPI strip — the four active-mentor figures, each a shared
 * KpiCard with the metric's info tooltip. No trend line (no backend period
 * data); recorded in design-divergence.md.
 */
export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className={styles.grid}>
      {kpis.map((k) => (
        <KpiCard key={k.key} label={k.label} value={k.value} unit={k.unit} info={k.info} />
      ))}
    </div>
  );
}
