import { useId, type Ref } from 'react';
import { Chip } from '@/components/atoms/Chip/Chip';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { GAP_COPY, HELP_COPY } from '@/lib/copy/mentorOnboarding';
import { groupTopics, type TopicOption } from '@/lib/utils/topicGroups';
import { StepTitles } from './StepTitles';
import styles from './steps.module.css';

/** The first chip: where focus goes when none is picked. */
export const HELP_FIRST_ID = 'mo-help-first';

type HelpAreasStepProps = {
  topics: TopicOption[];
  value: string[];
  onToggle: (id: string) => void;
  error: boolean;
  headingRef: Ref<HTMLHeadingElement>;
};

/** Step 1 (design `showHelp`): the 6 offerings as chips under the 4 headings, at least 1. */
export function HelpAreasStep({ topics, value, onToggle, error, headingRef }: HelpAreasStepProps) {
  const id = useId();
  const groups = groupTopics(topics);
  const firstId = groups[0]?.items[0]?.id;
  return (
    <section className={styles.section}>
      <StepTitles title={HELP_COPY.title} sub={HELP_COPY.sub} headingRef={headingRef} />
      {error && <FieldError>{GAP_COPY.help}</FieldError>}
      <div className={styles.groups}>
        {groups.map((g, i) => (
          <div key={g.label} role="group" aria-labelledby={`${id}-${i}`} className={styles.field}>
            <span id={`${id}-${i}`} className={styles.caption}>
              {g.label}
            </span>
            <div className={styles.chips}>
              {g.items.map((t) => (
                <Chip
                  key={t.id}
                  id={t.id === firstId ? HELP_FIRST_ID : undefined}
                  look="choice"
                  pressed={value.includes(t.id)}
                  onClick={() => onToggle(t.id)}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
