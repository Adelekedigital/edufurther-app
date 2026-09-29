import { SessionPreviewCard } from '@/components/molecules/SessionPreviewCard/SessionPreviewCard';
import { SummarySection } from '@/components/molecules/SummarySection/SummarySection';
import {
  DAY_NAMES,
  PLATFORM_BREAK_MIN,
  PLATFORM_WINDOW_DAYS,
  QUESTION_KIND_LABELS,
  STAGE_LABELS,
  timeLabel,
  type Draft,
} from '@/lib/utils/sessionTypeDraft';
import type { Topic } from '@/types/mentor';
import { approvalLabel, breakLabel, windowLabel, type Defaults } from './SchedulingStep';
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
  const stage = d.stage === 'other' ? d.customStage : d.stage ? STAGE_LABELS[d.stage] : 'Any stage';
  const windowDays =
    d.rules === 'custom' ? d.windowDays : (defaults?.windowDays ?? PLATFORM_WINDOW_DAYS);
  const breakMin = d.rules === 'custom' ? d.breakMin : (defaults?.breakMin ?? PLATFORM_BREAK_MIN);
  const approval =
    d.approval === 'inherit'
      ? `My default (${approvalLabel(defaults?.requiresApproval ?? false).toLowerCase()})`
      : approvalLabel(d.approval === 'on');
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
            { k: 'Length', v: `${d.durationMin} min` },
            { k: 'Minimum notice', v: `${d.noticeHours} hours` },
            {
              k: 'Bookable up to',
              v: `${windowLabel(windowDays)} ahead${d.rules === 'default' ? ' (my default)' : ''}`,
            },
            {
              k: 'Break after',
              v: `${breakLabel(breakMin)}${d.rules === 'default' ? ' (my default)' : ''}`,
            },
            { k: 'Hours', v: hoursSummary(d) },
            { k: 'Approval', v: approval },
          ]}
        />
      </div>
      <SessionPreviewCard
        name={d.name}
        description={d.description}
        facts={[`${d.durationMin} min`, ...(topicLabels.length ? topicLabels : ['Any topic'])]}
      />
    </div>
  );
}
