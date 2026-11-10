import { OVERVIEW } from '@/lib/copy/adminAnalytics';
import { trendModel, type TrendPoint } from './trendModel';
import styles from './TrendChart.module.css';

/**
 * The North Star trend (Admin Analytics.dc.html): this period solid blue,
 * the previous one dashed, a labelled y axis, each point's numbers in its
 * hover title, and the whole chart read by its label.
 */
export function TrendChart({
  series,
  unit,
  compare,
  windowLabel,
}: {
  series: readonly TrendPoint[];
  unit: 'day' | 'week';
  compare: boolean;
  windowLabel: string;
}) {
  const m = trendModel(series, compare);
  const first = series[0]?.value ?? 0;
  const last = series.at(-1)?.value ?? 0;
  return (
    <div className={styles.trend}>
      <div className={styles.plot}>
        <div aria-hidden="true" className={styles.axis}>
          {m.yLabels.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <svg
          viewBox="0 0 600 140"
          preserveAspectRatio="none"
          role="img"
          aria-label={OVERVIEW.chartLabel(unit, windowLabel, first, last)}
          className={styles.svg}
        >
          {m.grid.map((y, i) => (
            <line key={i} x1="0" x2="600" y1={y} y2={y} className={styles.grid} />
          ))}
          {m.prev && <path d={m.prev} className={styles.prev} />}
          <path d={m.cur} className={styles.cur} />
          {m.pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="10" className={styles.hit}>
              <title>
                {OVERVIEW.point(unit, i + 1, p.value, compare && m.prev ? p.previous : null)}
              </title>
            </circle>
          ))}
        </svg>
      </div>
      <div className={styles.ends}>
        <span>{OVERVIEW.first[unit]}</span>
        <span>{OVERVIEW.last[unit]}</span>
      </div>
      <div className={styles.legend}>
        <span className={styles.key}>
          <span aria-hidden="true" className={styles.swatchCur} />
          {OVERVIEW.legendThis[unit]}
        </span>
        {m.prev && (
          <span className={styles.key}>
            <span aria-hidden="true" className={styles.swatchPrev} />
            {OVERVIEW.legendPrevious}
          </span>
        )}
      </div>
    </div>
  );
}
