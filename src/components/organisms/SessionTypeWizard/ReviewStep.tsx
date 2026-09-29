import { SessionPreviewCard } from '@/components/molecules/SessionPreviewCard/SessionPreviewCard';
import { SummarySection } from '@/components/molecules/SummarySection/SummarySection';
import {
  DAY_NAMES,
  QUESTION_KIND_LABELS,
  stagesLabel,
  approvalLabel,
  breakLabel,
  hoursLabel,
  resolveDefaults,
  timeLabel,
  windowLabel,
  type Draft,
} from '@/lib/utils/sessionTypeDraft';
import type { Topic } from '@/types/mentor';
import type { Defaults } from './SchedulingStep';
import styles from './SessionTypeWizard.module.css';

/** "Wed 5:00 pm–8:00 pm; Sat 9:00 am–10:00 am". */
export function hoursSummary(d: Draft): string {
  if (d.hours === 'default') return 'Your Calendar availability';
  const parts = d.days.flatMap((day, i) =>
    day.on
      ? [
          `${DAY_NAMES[i]!.slice(0, 3)} ${day.slots.map(([a, b]) => `${timeLabel(a)}–${timeLabel(b)}`).join(', ')}`,
        ]
      : [],
  );
  return parts.length ? parts.join('; ') : 'No hours yet';
}

type ReviewStepProps = {
  draft: Draft;
  topics: Topic[];
  defaults: Defaults | null;
  onEdit: (step: 1 | 2 | 3) => void;
};

/** Step 4 (Session Types.dc.html `isStep4`): check answers, and the card as mentees see it. */
export function ReviewStep({ draft: d, topics, defaults, onEdit }: ReviewStepProps) {
  const topicLabels = d.topics.map((c) => topics.find((t) => t.slug === c)?.label ?? c);
  const stage = stagesLabel(d);
  // `defaults` is null until the mentor's own are known: then say "My default"
  // without a value rather than show the platform's as theirs (review of #49).
  const custom = d.rules === 'custom';
  const mine = defaults ? resolveDefaults(defaults) : null;
  const inherited = (text: (r: NonNullable<typeof mine>) => string) =>
    mine ? `${text(mine)} (my default)` : 'My default';
  const lengthText = custom ? `${d.durationMin} min` : inherited((r) => `${r.durationMin} min`);
  const noticeText = custom
    ? `${hoursLabel(d.noticeHours)} hours`
    : inherited((r) => `${hoursLabel(r.noticeHours)} hours`);
  const windowText = custom
    ? `${windowLabel(d.windowDays)} ahead`
    : inherited((r) => `${windowLabel(r.windowDays)} ahead`);
  const breakText = custom ? breakLabel(d.breakMin) : inherited((r) => breakLabel(r.breakMin));
  const approval =
    custom && d.approval !== 'inherit'
      ? approvalLabel(d.approval === 'on')
      : mine
        ? `My default (${approvalLabel(mine.requiresApproval).toLowerCase()})`
        : 'My default';
  // The card shows the length mentees will book; unknown until the defaults load.
  const length = custom ? d.durationMin : mine?.durationMin;
  return (
    <div className={styles.body4}>
      <div className={styles.summaries}>
        <SummarySection
          title="Core details"
          onEdit={() => onEdit(1)}
          rows={[
            { k: 'Name', v: d.name },
            { k: 'What mentees get', v: d.description },
            { k: topicLabels.length > 1 ? 'Topics' : 'Topic', v: topicLabels.join(', ') || '—' },
            { k: 'Best for', v: stage },
          ]}
        />
        <SummarySection
          title="Intake questions"
          onEdit={() => onEdit(2)}
          rows={
            d.questions.length
              ? d.questions.map((q, i) => ({
                  k: `${i + 1}. ${QUESTION_KIND_LABELS[q.kind]}`,
                  v: `${q.text}${q.required ? '' : ' (optional)'}${q.options.length ? ` · ${q.options.join(', ')}` : ''}`,
                }))
              : [{ k: 'Questions', v: 'None' }]
          }
        />
        <SummarySection
          title="Scheduling"
          onEdit={() => onEdit(3)}
          rows={[
            { k: 'Length', v: lengthText },
            { k: 'Minimum notice', v: noticeText },
            { k: 'Bookable up to', v: windowText },
            { k: 'Break after', v: breakText },
            { k: 'Hours', v: hoursSummary(d) },
            { k: 'Approval', v: approval },
          ]}
        />
      </div>
      <SessionPreviewCard
        name={d.name}
        description={d.description}
        facts={[
          ...(length ? [`${length} min`] : []),
          ...(topicLabels.length ? topicLabels : ['Any topic']),
        ]}
      />
    </div>
  );
}
