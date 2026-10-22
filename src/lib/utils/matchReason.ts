import { countryInSentence } from '@/lib/utils/format';
import { HELP_AREAS } from '@/lib/copy/onboarding';
import type { MatchBasis, MatchReason } from '@/types/onboarding';

/** "a", "a and b", "a, b and c". */
export function joinAnd(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function phrase(r: MatchReason): string | null {
  switch (r.code) {
    case 'study_country':
      return `Studied in ${countryInSentence(r.country.label)}`;
    case 'degree':
      return r.level;
    case 'help_areas': {
      // In the design's card order, whatever order the server sends.
      const phrases = HELP_AREAS.filter((h) => r.slugs.includes(h.slug)).map((h) => h.copy.reason);
      return phrases.length ? `Helps with ${joinAnd(phrases)}` : null;
    }
    case 'field':
      return r.field;
    case 'origin':
      return `Also from ${r.country.label}`;
  }
}

export type ReasonLine = { lead: string; rest: string; matched: boolean };

/**
 * One line per match card: the first reason bold, the rest after " · ". With
 * no reason, "{level} · {country}" and an info icon instead of the tick; null
 * when there is nothing at all to say.
 */
export function reasonLine(
  reasons: MatchReason[],
  fallback: { level: string | null; studyCountry: string | null },
): ReasonLine | null {
  const bits = reasons.map(phrase).filter((p): p is string => !!p);
  if (bits.length === 0) {
    const lead = [fallback.level, fallback.studyCountry && countryInSentence(fallback.studyCountry)]
      .filter(Boolean)
      .join(' · ');
    return lead ? { lead, rest: '', matched: false } : null;
  }
  return {
    lead: bits[0]!,
    rest: bits.length > 1 ? ` · ${bits.slice(1).join(' · ')}` : '',
    matched: true,
  };
}

/** "Based on: Master's Public Health in the UK · from Nigeria" (Mentee Onboarding v5.dc.html). */
export function basedOnLine(b: MatchBasis): string | null {
  const subject = [b.degree, b.field, b.country ? `in ${countryInSentence(b.country)}` : null]
    .filter(Boolean)
    .join(' ');
  const from = b.origin ? `from ${b.origin}` : '';
  const line = subject && from ? `${subject} · ${from}` : subject || from;
  return line ? `Based on: ${line}` : null;
}
