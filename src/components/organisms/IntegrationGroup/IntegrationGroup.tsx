import { Children, type ReactNode } from 'react';
import styles from './IntegrationGroup.module.css';

type IntegrationGroupProps = {
  title: string;
  description: string;
  /** One `IntegrationRow` per app. Dividers are drawn between them. */
  children: ReactNode;
};

/**
 * A titled section of integrations over one bordered card
 * (Integrations.dc.html `groups`). The divider belongs between rows, not on
 * the first, so the card's own border is never doubled.
 */
export function IntegrationGroup({ title, description, children }: IntegrationGroupProps) {
  const rows = Children.toArray(children);
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.subtitle}>{description}</span>
      </div>
      <div className={styles.card}>
        {rows.map((row, i) => (
          <div key={i} className={i ? styles.divided : undefined}>
            {row}
          </div>
        ))}
      </div>
    </section>
  );
}
