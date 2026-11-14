import type { components } from '@/lib/api/generated/schema';
import type { IntakeQuestion, SessionType } from '@/types/mentor';

type SessionTypeRead = components['schemas']['SessionTypeRead'];
type QuestionRead = components['schemas']['QuestionRead'];

/** SessionTypeRead → SessionType, for booking, the profile and Session types alike. */
export function toQuestion(q: QuestionRead): IntakeQuestion {
  return {
    id: q.id,
    label: q.question_text,
    kind:
      q.question_type === 'file_upload'
        ? 'file'
        : q.question_type === 'multi_choice'
          ? q.allows_multiple
            ? 'multi'
            : 'single'
          : 'text',
    required: q.is_required,
    options: (q.options ?? []).map((o) => ({ id: o.id, label: o.text })),
  };
}

export function toSessionType(r: SessionTypeRead): SessionType {
  return {
    id: r.id,
    name: r.name,
    durationMin: r.duration_minutes,
    description: r.description?.trim() ?? '',
    // The window this type really uses (the platform cap applied), backend #309.
    windowDays: r.booking_window_days,
    // Request or instant: picks "Request …" vs "Book …" before sending.
    requiresConfirmation: r.requires_booking_confirmation !== false,
    // The live intake form, in the order mentees see it (backend #268).
    questions: [...(r.questions ?? [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map(toQuestion),
  };
}
