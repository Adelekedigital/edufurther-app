import { Icon } from '@/components/atoms/Icon/Icon';
import { Textarea } from '@/components/atoms/Input/Input';
import { Radio } from '@/components/atoms/Radio/Radio';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import { FileField } from '@/components/molecules/FileField/FileField';
import type { IntakeAnswer, IntakeQuestion } from '@/types/mentor';
import type { Upload } from './useIntakeAnswers';
import styles from './BookingFlow.module.css';

type Props = {
  firstName: string;
  questions: IntakeQuestion[];
  answers: Record<string, IntakeAnswer>;
  uploads: Record<string, Upload>;
  onAnswer: (id: string, a: IntakeAnswer) => void;
  onUpload: (q: IntakeQuestion, file: File | null) => void;
  /** The server refused this question's answer: its message shows under it. */
  refused: { questionId: string; message: string } | null;
  isPhone: boolean;
};

/** The mentor's intake questions, every kind the offering can ask. */
export function QuestionsStep(p: Props) {
  return (
    <div className={styles.questions}>
      <p className={styles.intro}>
        {p.firstName} reads these before your session. About 2 minutes.
      </p>
      {p.questions.map((q) => {
        const refused =
          p.refused?.questionId === q.id ? (
            <p role="alert" className={styles.error}>
              <Icon name="error" size={16} />
              {p.refused.message}
            </p>
          ) : null;
        const req = q.required && (
          <>
            {' '}
            <span aria-hidden className={styles.req}>
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        );
        if (q.kind === 'file') {
          const u = p.uploads[q.id];
          return (
            <div key={q.id} className={styles.field}>
              <FileField
                label={q.label}
                required={q.required}
                fileName={p.answers[q.id]?.file?.name ?? null}
                status={u?.status ?? 'idle'}
                pendingName={u?.file.name}
                error={u?.error}
                onRetry={u ? () => p.onUpload(q, u.file) : undefined}
                onFile={(f) => p.onUpload(q, f)}
              />
              {refused}
            </div>
          );
        }
        if (q.kind === 'single')
          return (
            // Choice questions as built, confirmed by design (reply 2026-09-29, #6).
            <fieldset key={q.id} className={styles.choice}>
              <legend className={styles.fieldLabelStrong}>
                {q.label}
                {req}
              </legend>
              {q.options.map((o) => (
                <label key={o.id} className={styles.option}>
                  <Radio
                    name={`q-${q.id}`}
                    checked={p.answers[q.id]?.optionIds?.[0] === o.id}
                    onChange={() => p.onAnswer(q.id, { optionIds: [o.id] })}
                  />
                  {o.label}
                </label>
              ))}
              {refused}
            </fieldset>
          );
        if (q.kind === 'multi') {
          const picked = p.answers[q.id]?.optionIds ?? [];
          return (
            // Choice questions as built, confirmed by design (reply 2026-09-29, #6).
            <div key={q.id} className={styles.field}>
              <span className={styles.fieldLabelStrong} aria-hidden>
                {q.label}
                {req}
              </span>
              <ChoiceChips
                label={`${q.label}${q.required ? ' (required)' : ''} — pick any that apply`}
                options={q.options.map((o) => ({ value: o.id, label: o.label }))}
                selected={picked}
                onToggle={(id) =>
                  p.onAnswer(q.id, {
                    optionIds: picked.includes(id)
                      ? picked.filter((x) => x !== id)
                      : [...picked, id],
                  })
                }
              />
              {refused}
            </div>
          );
        }
        return (
          <label key={q.id} className={styles.field}>
            <span className={styles.fieldLabelStrong}>
              {q.label}
              {req}
            </span>
            <Textarea
              rows={p.isPhone ? 4 : 3}
              maxLength={2000}
              value={p.answers[q.id]?.text ?? ''}
              required={q.required}
              onChange={(e) => p.onAnswer(q.id, { text: e.target.value })}
            />
            {refused}
          </label>
        );
      })}
    </div>
  );
}
