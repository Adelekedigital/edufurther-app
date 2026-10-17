/**
 * One name rule for every name input, whether it asks for one "Full name" or
 * separate first and last names (PRD: Sign up and log in). Both shapes check
 * the same characters, so the two can never disagree about what a name is.
 *
 * Letters in any script, combining marks (the dot below in Yoruba and Igbo
 * letters, typed as a letter plus a mark), spaces, apostrophes (’ and '),
 * hyphens and full stops. No digits, no other symbols.
 */
const ALLOWED = /^[\p{L}\p{M}\s’'.-]+$/u;
const HAS_LETTER = /\p{L}/u;
/** More marks on one letter than any real name carries (Yoruba stacks two). */
const MARK_PILE = /\p{M}{4,}/u;
/**
 * Invisible characters that ride along in text pasted from documents and chat
 * apps: zero-width space, soft hyphen, word joiner, BOM. Dropped, so a name
 * that looks right isn't refused for something nobody can see. ZWJ/ZWNJ are
 * not dropped: in some scripts they change the name, so they stay refused.
 */
const INVISIBLE = /[​­⁠﻿]/g;

/** Per part, after the split (handoff: 1–60 characters per field). */
export const NAME_PART_MAX = 60;

export type NameProblem = 'required' | 'oneWord' | 'characters' | 'tooLong';

/**
 * `oneWord` and `characters` match the backend's 422 copy (PRD, Q2 provisional).
 * `tooLong` has no design copy yet: provisional, ours.
 */
export const NAME_PROBLEM_COPY: Record<NameProblem, string> = {
  required: 'Enter your name.',
  oneWord: 'Enter your first and last name.',
  characters: 'Use letters, spaces, hyphens, apostrophes or full stops.',
  tooLong: `Keep each name to ${NAME_PART_MAX} characters or fewer.`,
};

/**
 * What the person meant to type, and what is saved: composed (NFC, so "ọ̀"
 * typed as a letter plus marks counts and compares like the precomposed
 * one), invisible characters dropped, trimmed, inner spaces collapsed.
 */
export function tidyName(value: string): string {
  return value.normalize('NFC').replace(INVISIBLE, '').trim().replace(/\s+/g, ' ');
}

/**
 * First word is the first name, the rest is the last name
 * ("Chiamaka Ngozi Obi" → "Chiamaka" / "Ngozi Obi"). A name that doesn't fit
 * first-then-last is fixed later where the two are edited separately.
 */
export function splitFullName(value: string): { firstName: string; lastName: string } {
  const [firstName = '', ...rest] = tidyName(value).split(' ');
  return { firstName, lastName: rest.join(' ') };
}

function partProblem(part: string): NameProblem | null {
  // Every word needs a letter: "-" or "." alone is not a name.
  if (
    !ALLOWED.test(part) ||
    MARK_PILE.test(part) ||
    part.split(' ').some((w) => !HAS_LETTER.test(w))
  ) {
    return 'characters';
  }
  return part.length > NAME_PART_MAX ? 'tooLong' : null;
}

/** One "Full name" field: two words or more, each part within the rule. */
export function checkFullName(value: string): NameProblem | null {
  const name = tidyName(value);
  if (!name) return 'required';
  // Characters first: "J0hn" is a character problem, not a one-word one.
  if (partProblem(name) === 'characters') return 'characters';
  const { firstName, lastName } = splitFullName(name);
  if (!lastName) return 'oneWord';
  return partProblem(firstName) ?? partProblem(lastName);
}

/** One of separate first / last name fields. Spaces are allowed ("Ngozi Obi"). */
export function checkNamePart(value: string): NameProblem | null {
  const part = tidyName(value);
  if (!part) return 'required';
  return partProblem(part);
}
