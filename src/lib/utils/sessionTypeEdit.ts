/**
 * Editing a session type (Session Types PR 4): what changed between the saved
 * type and the draft, as the requests that save it. The type's own fields go
 * in one PATCH (only the ones that changed); questions and dedicated hours are
 * separate resources, each diffed so untouched ones are left alone.
 */
import {
  toCreateBody,
  toQuestionWrite,
  type DraftQuestion,
  type QuestionKind,
  type Draft,
} from './sessionTypeDraft';

/** A saved question, as read (the data layer maps QuestionRead to this). */
export type SavedQuestion = {
  id: string;
  text: string;
  kind: QuestionKind;
  required: boolean;
  options: { id: string; text: string }[];
};

/**
 * PATCH /me/session-types/{id}: only the fields whose value differs from the
 * saved draft's (so saving an untouched rule never pins a default).
 */
export function toPatchBody(d: Draft, saved: Draft, offeringIds: Record<string, string>) {
  const { questions: _a, ...next } = toCreateBody(d, offeringIds);
  const { questions: _b, ...before } = toCreateBody(saved, offeringIds);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(next) as (keyof typeof next)[])
    if (JSON.stringify(next[k]) !== JSON.stringify(before[k])) out[k] = next[k];
  return out as Partial<typeof next>;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The question requests: removed ones deleted, changed ones patched (a choice's
 * options keep their ids by text, so an answer that chose one still points at
 * it), new ones added, and the order saved when it changed.
 */
export function planQuestions(draft: DraftQuestion[], saved: SavedQuestion[]) {
  const kept = new Set(draft.flatMap((q) => (q.id ? [q.id] : [])));
  const remove = saved.filter((s) => !kept.has(s.id)).map((s) => s.id);
  const update: { id: string; body: Record<string, unknown> }[] = [];
  const add: { key: string; body: ReturnType<typeof toQuestionWrite> }[] = [];
  draft.forEach((q, i) => {
    const s = q.id ? saved.find((x) => x.id === q.id) : undefined;
    if (!s) {
      add.push({ key: q.key, body: toQuestionWrite(q, i) });
      return;
    }
    const w = toQuestionWrite(q, i);
    const body: Record<string, unknown> = {};
    if (w.question_text !== s.text) body.question_text = w.question_text;
    if (w.is_required !== s.required) body.is_required = w.is_required;
    if (q.kind !== s.kind) {
      body.question_type = w.question_type;
      if ('allows_multiple' in w) body.allows_multiple = w.allows_multiple;
    }
    if ('options' in w && w.options) {
      const texts = w.options.map((o) => o.text);
      const before = s.options.map((o) => o.text);
      if (JSON.stringify(texts) !== JSON.stringify(before) || q.kind !== s.kind)
        body.options = texts.map((text) => {
          const match = s.options.find((o) => same(o.text, text));
          return match ? { id: match.id, text } : { text };
        });
    }
    if (Object.keys(body).length) update.push({ id: s.id, body });
  });
  const savedOrder = saved.map((s) => s.id);
  const draftOrder = draft.map((q) => q.id ?? `new:${q.key}`);
  const reorder = JSON.stringify(savedOrder) !== JSON.stringify(draftOrder);
  return { remove, update, add, reorder };
}
