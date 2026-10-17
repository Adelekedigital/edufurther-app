import { Tag } from '@/components/atoms/Tag/Tag';
import { groupTopics } from '@/lib/utils/topicGroups';
import type { Topic } from '@/types/mentor';
import { cx } from '@/lib/utils/cx';
import styles from './TopicGroups.module.css';

type TopicGroupsProps = {
  topics: Topic[];
  /** sm: the desktop popover's 12px chips; md: the phone sheet's 14px chips (MentorCard.dc.html). */
  size?: 'sm' | 'md';
};

/** A mentor's help areas under the design's group captions ("Applications", "Funding", …). */
export function TopicGroups({ topics, size = 'sm' }: TopicGroupsProps) {
  const groups = groupTopics(topics.map((t) => ({ id: t.slug, slug: t.slug, label: t.label })));
  return (
    <div className={cx(styles.groups, size === 'md' && styles.md)}>
      {groups.map((g) => (
        <div key={g.label} className={styles.group}>
          <p className={styles.caption}>{g.label}</p>
          <ul className={styles.list} aria-label={g.label}>
            {g.items.map((t) => (
              <li key={t.slug}>
                <Tag tone="neutral" className={styles.chip}>
                  {t.label}
                </Tag>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
