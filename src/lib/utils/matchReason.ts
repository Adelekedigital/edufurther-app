import { HELP_AREAS } from '@/lib/copy/onboarding';
import type { MatchBasis, MatchReason } from '@/types/onboarding';

/** "the UK", "the US", "the Netherlands"; any other country as named (PRD H8). */
export function countryInSentence(name: string): string {
  if (name === 'United Kingdom') return 'the UK';
  if (name === 'United States') return 'the US';
  if (name === 'Netherlands') return 'the Netherlands';
  return name;
}

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
 * no reason, "{level} · {country}" and an info icon instead of the tick.
 */
export function reasonLine(
  reasons: MatchReason[],
  fallback: { level: string | null; studyCountry: string | null },
): ReasonLine {
  const bits = reasons.map(phrase).filter((p): p is string => !!p);
  if (bits.length === 0) {
    const lead = [fallback.level, fallback.studyCountry && countryInSentence(fallback.studyCountry)]
      .filter(Boolean)
      .join(' · ');
    return { lead, rest: '', matched: false };
  }
  return {
    lead: bits[0]!,
    rest: bits.length > 1 ? ` · ${bits.slice(1).join(' · ')}` : '',
    matched: true,
  };
}

/** "Based on: Master's Public Health in the UK · from Nigeria" (Mentee Onboarding v5.dc.html). */
export function basedOnLine(b: MatchBasis): string | null {
  const parts = [
    b.degree,
    b.field,
    b.country ? `in ${countryInSentence(b.country)}` : null,
    b.origin ? `· from ${b.origin}` : null,
  ].filter(Boolean);
  return parts.length ? `Based on: ${parts.join(' ')}` : null;
}
