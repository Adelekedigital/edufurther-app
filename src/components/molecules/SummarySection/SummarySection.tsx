import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './SummarySection.module.css';

type SummarySectionProps = {
  title: string;
  rows: { k: string; v: string }[];
  /** Goes back to the step that owns these answers. */
  onEdit: () => void;
};

/**
 * One block of the Review step (Session Types.dc.html `summary`): a title with
 * Edit, then label / value rows — the GOV.UK "check answers" shape.
 */
export function SummarySection({ title, rows, onEdit }: SummarySectionProps) {
  return (
    <section className={styles.box} aria-label={title}>
      <div className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        <button type="button" className={styles.edit} onClick={onEdit}>
          <Icon name="edit" size={16} />
          Edit<span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      <dl className={styles.rows}>
        {rows.map((r, i) => (
          <div key={`${r.k}-${i}`} className={styles.row}>
            <dt className={styles.k}>{r.k}</dt>
            <dd className={styles.v}>{r.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
