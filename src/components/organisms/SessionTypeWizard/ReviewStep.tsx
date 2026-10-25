import { SessionPreviewCard } from '@/components/molecules/SessionPreviewCard/SessionPreviewCard';
import { SummarySection } from '@/components/molecules/SummarySection/SummarySection';
import {
  QUESTION_KIND_LABELS,
  stagesLabel,
  breakLabel,
  hoursLabel,
  resolveDefaults,
  windowLabel,
  type Draft,
} from '@/lib/utils/sessionTypeDraft';
import { BOOKING_COPY, approvalShort } from '@/lib/copy/mentorSettings';
import {
  DETAILS_COPY,
  REVIEW_COPY,
  RULES_COPY,
  STARTER_COPY,
  venueLabel,
} from '@/lib/copy/sessionTypes';
import { bookingRulesSummary } from '@/lib/utils/calendar';
import type { Topic } from '@/types/mentor';
import type { Defaults } from './SchedulingStep';
import styles from './SessionTypeWizard.module.css';

/** Availability (PRD step 4): the weekly hours with their summary, or the session's own. */
export function hoursSummary(d: Draft, weekly: string | null): string {
  return d.hours === 'default' ? REVIEW_COPY.weekly(weekly) : REVIEW_COPY.ownHours;
}

type ReviewStepProps = {
  draft: Draft;
  topics: Topic[];
  defaults: Defaults | null;
  /** The mentor's weekly hours, once loaded ("Mon–Fri · 9 am–5 pm"). */
  weeklySummary: string | null;
  /** The mentor's default video, once loaded ("EduFurther video"). */
  defaultVideo: string | null;
  onEdit: (step: 1 | 2 | 3) => void;
};

/** Step 4 (Session Types.dc.html `isStep4`): check answers, and the card as mentees see it. */
export function ReviewStep({
  draft: d,
  topics,
  defaults,
  weeklySummary,
  defaultVideo,
  onEdit,
}: ReviewStepProps) {
  const topicLabels = d.topics.map((c) => topics.find((t) => t.slug === c)?.label ?? c);
  const stage = stagesLabel(d);
  // `defaults` is null until the mentor's own are known: then say "My defaults"
  // without values rather than show the platform's as theirs (review of #49).
  const custom = d.rules === 'custom';
  const mine = defaults ? resolveDefaults(defaults) : null;
  // Inheriting: one "Booking rules" row (PRD step 4); customized: a row each.
  const ruleRows = custom
    ? [
        { k: REVIEW_COPY.length, v: `${d.durationMin} min` },
        { k: BOOKING_COPY.rules.noticeHours.label, v: `${hoursLabel(d.noticeHours)} hours` },
        { k: BOOKING_COPY.rules.windowDays.label, v: `${windowLabel(d.windowDays)} ahead` },
        { k: BOOKING_COPY.rules.breakMin.label, v: breakLabel(d.breakMin) },
      ]
    : [
        {
          k: REVIEW_COPY.rulesRow,
          v: REVIEW_COPY.rulesMine(defaults ? bookingRulesSummary(defaults, 'none') : null),
        },
      ];
  // The approval select's words: "{default} (your default)" while inheriting.
  const approval =
    custom && d.approval !== 'inherit'
      ? approvalShort(d.approval === 'on')
      : RULES_COPY.inheritApproval(mine ? approvalShort(mine.requiresApproval) : null);
  // The card shows the length mentees will book; unknown until the defaults load.
  const length = custom ? d.durationMin : mine?.durationMin;
  return (
    <div className={styles.body4}>
      <div className={styles.summaries}>
        <SummarySection
          title={REVIEW_COPY.details}
          onEdit={() => onEdit(1)}
          rows={[
            { k: 'Name', v: d.name },
            { k: 'What mentees get', v: d.description },
            {
              k: topicLabels.length > 1 ? 'Topics' : 'Topic',
              v: topicLabels.join(', ') || REVIEW_COPY.none,
            },
            { k: 'Best for', v: stage },
            { k: DETAILS_COPY.priceLabel, v: DETAILS_COPY.free },
          ]}
        />
        <SummarySection
          title={REVIEW_COPY.questions}
          onEdit={() => onEdit(2)}
          rows={
            d.questions.length
              ? d.questions.map((q, i) => ({
                  k: `${i + 1}. ${QUESTION_KIND_LABELS[q.kind]}`,
                  v: `${q.text}${q.required ? '' : ' (optional)'}${q.synced ? STARTER_COPY.syncedReview : q.options.length ? ` · ${q.options.join(', ')}` : ''}`,
                }))
              : [{ k: 'Questions', v: REVIEW_COPY.none }]
          }
        />
        <SummarySection
          title={REVIEW_COPY.rules}
          onEdit={() => onEdit(3)}
          rows={[
            ...ruleRows,
            { k: REVIEW_COPY.hours, v: hoursSummary(d, weeklySummary) },
            { k: BOOKING_COPY.approveTitle, v: approval },
            // The select's words, in both modes.
            { k: RULES_COPY.videoTitle, v: venueLabel(d.venue, defaultVideo) },
          ]}
        />
      </div>
      <SessionPreviewCard
        name={d.name}
        description={d.description}
        facts={[
          ...(length ? [`${length} min`] : []),
          DETAILS_COPY.free,
          ...(topicLabels.length ? topicLabels : ['Any topic']),
        ]}
      />
    </div>
  );
}
