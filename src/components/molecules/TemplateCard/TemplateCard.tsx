import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './TemplateCard.module.css';

type TemplateCardProps = {
  href: string;
  icon: IconName;
  name: string;
  /** e.g. "60 min · 2 questions". */
  hint: string;
};

/**
 * "Start from a template" card (Session Types.dc.html `templates`). A link, not
 * a button: it opens the create form pre-filled, a real destination.
 */
export function TemplateCard({ href, icon, name, hint }: TemplateCardProps) {
  return (
    <Link href={href} prefetch={false} className={styles.card}>
      <Icon name={icon} size={22} className={styles.icon} />
      <span className={styles.name}>{name}</span>
      <span className={styles.hint}>{hint}</span>
    </Link>
  );
}
