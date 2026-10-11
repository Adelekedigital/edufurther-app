import type { PickableReason } from '@/types/booking';

/**
 * The coded reasons a person can pick, each with the two pieces of copy it
 * owns — and they are deliberately different strings doing different jobs:
 *
 *  - `label` is what the person **picking** reads, in the first person.
 *  - `reads` is what the **other party** reads afterwards, in neither person's
 *    voice, because nobody wrote it.
 *
 * Both live here, in one row, so rewording one puts the other in front of you.
 * Apart, a chip gets reworded and the sentence quietly keeps saying the old
 * thing — and the sentence is the one a real person reads. That is failure
 * mode #59: one meaning, several copies.
 *
 * This file is `lib/utils` rather than `types/booking.ts` so that both sides
 * may import it: `ReasonField` is a molecule and cannot reach into
 * `lib/api/data`, where the reading half is needed.
 *
 * `reads` carries **no pronoun** (we are never told anyone's) and **no verb for
 * the ending** — the details panel's heading already says "Amara cancelled this
 * session", so a sentence repeating it would read as a stutter. It is shown
 * unquoted, unlike a written note: quoting words nobody typed would put them in
 * someone's mouth.
 *
 * PROVISIONAL LABELS. `CancelModal.dc.html` draws no coded reasons at all — one
 * free-text box — so every `label` here is ours. See divergence 42.
 */
const REASONS: { value: PickableReason; label: string; reads: string | null }[] = [
  { value: 'scheduling_conflict', label: 'A clash in my calendar', reads: 'A calendar clash.' },
  { value: 'mentor_unavailable', label: 'I’m no longer free', reads: 'No longer free at that time.' },
  {
    value: 'mentee_no_longer_needed',
    label: 'I no longer need it',
    reads: 'The session was no longer needed.',
  },
  { value: 'technical_issue', label: 'Something technical', reads: 'A technical problem.' },
  // The only one with nothing to say on its own, which is exactly why its note
  // is required: without it the other party would read nothing at all.
  { value: 'other', label: 'Something else', reads: null },
];

/**
 * The reasons this side may offer. A code outside its list is a 422 — the
 * backend's `_MENTOR_REASONS` / `_MENTEE_REASONS`, confirmed 2026-10-10.
 *
 * Filtered by **side only**: the action does not change it, so a mentee
 * cancelling and a mentee withdrawing are offered the same reasons (owner,
 * 2026-10-10; and the server agrees). `other` is last, which the backend asked
 * for, and is one of the three both roles may send.
 */
export function reasonsFor(side: 'mentor' | 'mentee') {
  return REASONS.filter((r) =>
    side === 'mentor' ? r.value !== 'mentee_no_longer_needed' : r.value !== 'mentor_unavailable',
  );
}

/**
 * How a coded reason reads to the other party, or null when the code says
 * nothing on its own (`other`, whose note carries it instead).
 *
 * Null for an unknown code too: the enum holds five system-set members we never
 * offer, and inventing a phrase for `admin_action` would be worse than silence.
 */
export function reasonReads(code: string | null | undefined): string | null {
  if (!code) return null;
  return REASONS.find((r) => r.value === code)?.reads ?? null;
}

/**
 * Why this submit cannot go through, or null when it can. **One definition**,
 * exported, so the field, the dialog and the tests cannot drift into three
 * slightly different rules.
 *
 * `suggesting` is a mentor offering another time instead, which stands in for
 * the explanation — the only exemption (owner, 2026-10-10), and the same one
 * the design waives (`needsReason = !dec && !panel`) and the server waives
 * (backend #417, when `suggested_starts_at` is present).
 */
export function reasonError({
  reasonCode,
  text,
  required,
  suggesting,
}: {
  reasonCode: PickableReason | null;
  text: string;
  required?: boolean;
  suggesting?: boolean;
}): { field: 'reason' | 'note'; message: string } | null {
  if (!required || suggesting) return null;
  // Not "so they know what happened": what reaches them is `reads` above, not
  // this label, and on `other` it is the note. Either way the person picking
  // does not need the mechanics explained in an error message.
  if (!reasonCode) return { field: 'reason', message: 'Pick a reason before you go on.' };
  // "Something else" on its own records that none of the options fit and
  // nothing about what did. Non-empty after trimming, with no length floor: a
  // floor invites "asdf" and punishes someone typing a true short answer like
  // "visa refused".
  if (reasonCode === 'other' && !text.trim())
    return { field: 'note', message: 'Say briefly what happened.' };
  return null;
}
