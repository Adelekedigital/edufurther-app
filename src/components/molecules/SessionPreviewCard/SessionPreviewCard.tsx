import styles from './SessionPreviewCard.module.css';
import { Tag } from '@/components/atoms/Tag/Tag';

type SessionPreviewCardProps = {
  name: string;
  description: string;
  /** e.g. ["60 min", "Document preparation"]. */
  facts: string[];
};

/**
 * "How mentees see it" (Session Types.dc.html step 4 aside): the card as it
 * reads on the profile. The Book button is a picture of it, not a control.
 */
export function SessionPreviewCard({ name, description, facts }: SessionPreviewCardProps) {
  return (
    <aside className={styles.aside} aria-label="How mentees see it">
      <span className={styles.caption} aria-hidden>
        How mentees see it
      </span>
      <div className={styles.card}>
        <span className={styles.name}>{name || 'Untitled session'}</span>
        {description && <span className={styles.description}>{description}</span>}
        <div className={styles.facts}>
          {facts.map((f) => (
            <Tag key={f} tone="fact">
              {f}
            </Tag>
          ))}
        </div>
        <span className={styles.book} aria-hidden>
          Book this session
        </span>
      </div>
    </aside>
  );
}
