/**
 * PHASE A MOCK STATE for mentee onboarding (Mentee Onboarding v5), served by
 * app/api/mock/… only when ENABLE_MOCK_API=1. In memory for the server's
 * lifetime. **PENDING BACKEND** (docs/handoff/onboarding-backend-request.md):
 * `PUT /me/onboarding`, `field_of_study`, the completion rule's `missing` and
 * `/me/mentor-matches` follow the request's shapes until the backend ships them.
 */
import type { WireMatches } from '@/lib/api/data/pending';
import { mockAvailabilityState, mockNextAvailableAt } from './availability';
import { MOCK_COUNTRIES, mockItems } from './catalog';
import { MOCK_DEGREE_LEVELS } from './entries';
import { MENTORS, OFFERINGS, mockCountries } from './fixtures';

type Progress = { last_step: string | null; completed_at: string | null };
type Goal = {
  degree_goal_id: string | null;
  degree_goal_raw: string | null;
  field_of_study: string | null;
  country_ids: string[];
  need_ids: string[];
  target_start_term: string | null;
  notes: string | null;
};

/** The mock viewer's id (lib/api/data/viewer.ts): `/me` routes act for it. */
export const MOCK_VIEWER_ID = 'mock-viewer';

const progress = new Map<string, Progress>();
const goals = new Map<string, Goal>();

export const STEPS = ['help', 'plans'] as const;

export const mockProgress = (userId: string) => progress.get(userId) ?? null;

export function setMockStep(userId: string, step: string) {
  const p = progress.get(userId);
  // Never moves completed_at (PRD B2).
  progress.set(userId, { last_step: step, completed_at: p?.completed_at ?? null });
}

export function mockGoal(userId: string) {
  const g = goals.get(userId);
  if (!g) return null;
  const level = MOCK_DEGREE_LEVELS.find((l) => l.id === g.degree_goal_id) ?? null;
  return {
    id: `goal-${userId}`,
    degree_goal: level,
    degree_goal_raw: g.degree_goal_raw,
    target_start_term: g.target_start_term,
    notes: g.notes,
    field_of_study: g.field_of_study,
    countries: g.country_ids.flatMap((id, i) => {
      const c = MOCK_COUNTRIES.find((x) => x.id === id);
      return c ? [{ code: c.code, display_name: c.display_name, priority: i + 1 }] : [];
    }),
    needs: g.need_ids.flatMap((id) =>
      OFFERINGS.filter((o) => o.id === id).map((o) => ({
        id: o.id,
        code: o.code ?? '',
        display_name: o.display_name,
      })),
    ),
  };
}

export function setMockGoal(userId: string, body: Partial<Goal>) {
  const before = goals.get(userId);
  goals.set(userId, {
    degree_goal_id: body.degree_goal_id ?? null,
    degree_goal_raw: body.degree_goal_raw ?? null,
    // Omitted leaves it as it is; null or blank clears it (backend #1).
    field_of_study:
      'field_of_study' in body
        ? body.field_of_study?.trim() || null
        : (before?.field_of_study ?? null),
    // Omit a list to leave it alone (the contract).
    country_ids: body.country_ids ?? before?.country_ids ?? [],
    need_ids: body.need_ids ?? before?.need_ids ?? [],
    target_start_term: body.target_start_term ?? null,
    notes: body.notes ?? null,
  });
}

/** PRD B3: ≥ 1 need AND origin AND degree AND field. Destination may be empty. */
export function mockMissing(userId: string): string[] {
  const g = goals.get(userId);
  const missing: string[] = [];
  if (!g?.need_ids.length) missing.push('help');
  if (!mockItems(userId).origin_country_id) missing.push('origin');
  if (!g?.degree_goal_id) missing.push('degree');
  if (!g?.field_of_study) missing.push('field');
  return missing;
}

/** First call 201, later 200 with the same completed_at (idempotent). */
export function completeMock(userId: string): { status: 200 | 201; completed_at: string } {
  const p = progress.get(userId);
  if (p?.completed_at) return { status: 200, completed_at: p.completed_at };
  const completed_at = new Date().toISOString();
  progress.set(userId, { last_step: p?.last_step ?? 'plans', completed_at });
  return { status: 201, completed_at };
}

/** A rough level from the mentor's degree line, for the mock ranking only. */
function levelOf(degree: string | null | undefined): { rank: number; label: string } | null {
  if (!degree) return null;
  if (/^(phd|dphil|doctor)/i.test(degree)) return { rank: 3, label: 'PhD' };
  if (/^(m|mba)/i.test(degree)) return { rank: 2, label: 'Master’s' };
  if (/^b/i.test(degree)) return { rank: 1, label: 'Bachelor’s' };
  return null;
}
const RANK: Record<string, number> = { bachelors: 1, masters: 2, doctorate: 3 };

/**
 * The PRD B4 order, approximately (the real rule lives in the backend's
 * domain/matching.py): study country, level, help areas, field, origin, soonest.
 */
export function mockMatches(userId: string, limit: number, forMentor: string | null): WireMatches {
  const g = goals.get(userId);
  const dest = MOCK_COUNTRIES.find((c) => c.id === g?.country_ids[0])?.display_name ?? null;
  const originId = mockItems(userId).origin_country_id ?? null;
  const origin = MOCK_COUNTRIES.find((c) => c.id === originId)?.display_name ?? null;
  const level = MOCK_DEGREE_LEVELS.find((l) => l.id === g?.degree_goal_id) ?? null;
  const wantRank = level ? (RANK[level.code] ?? 0) : 0;
  const field = g?.field_of_study?.toLowerCase() ?? '';
  const now = Date.now();

  // Bookable only: taking bookings and with open times (PRD US-4, handoff Matching).
  const bookable = MENTORS.filter(
    (m) => m.taking_bookings !== false && mockAvailabilityState(m.id) !== 'none',
  );
  const scored = bookable.map((m) => {
    const c = mockCountries(m.id);
    const lv = levelOf(m.degree);
    const offered = (m.offerings ?? []).map((o) => OFFERINGS.find((x) => x.code === o.slug)?.id);
    const areas = (g?.need_ids ?? []).filter((id) => offered.includes(id));
    const s = {
      country: dest && c.primary_study_country === dest ? 1 : 0,
      level: lv && wantRank ? (lv.rank === wantRank ? 1 : lv.rank > wantRank ? 0.5 : 0) : 0,
      areas: areas.length,
      field: field && (m.study_course ?? '').toLowerCase().includes(field.split(' ')[0]!) ? 1 : 0,
      origin: origin && c.origin_country === origin ? 1 : 0,
      soon: -(Date.parse(mockNextAvailableAt(m.id, now) ?? '') || Infinity),
    };
    const ref = (name: string) => ({
      id: MOCK_COUNTRIES.find((x) => x.display_name === name)?.id ?? name,
      label: name,
    });
    const reasons: WireMatches['matches'][number]['reasons'] = [
      ...(s.country ? [{ code: 'study_country' as const, country: ref(dest!) }] : []),
      ...(s.level === 1 && lv
        ? [{ code: 'degree' as const, level: { id: level!.id, label: lv.label } }]
        : []),
      ...(areas.length ? [{ code: 'help_areas' as const, offering_ids: areas }] : []),
      ...(s.field ? [{ code: 'field' as const, field: m.study_course! }] : []),
      ...(s.origin ? [{ code: 'origin' as const, country: ref(origin!) }] : []),
    ];
    return {
      key: [s.country, s.level, s.areas, s.field, s.origin, s.soon],
      match: {
        mentor: {
          ...m,
          ...c,
          next_available_at: mockNextAvailableAt(m.id, now),
          next_available_state: mockAvailabilityState(m.id),
        },
        reasons,
        level: lv?.label ?? null,
        study_country: c.primary_study_country,
      },
    };
  });
  scored.sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return b.key[i]! - a.key[i]!;
    return 0;
  });

  const picked = forMentor ? scored.find((x) => x.match.mentor.slug === forMentor) : null;
  const rest = scored.filter((x) => x !== picked);
  const rows = picked ? [picked] : rest.slice(0, limit);
  return {
    matches: rows.map((r) => r.match),
    exact: rows.some((r) => r.key[0]! > 0 || r.key[1]! > 0),
    based_on: {
      degree: level
        ? { id: level.id, label: level.display_name, raw: g?.degree_goal_raw ?? null }
        : null,
      field: g?.field_of_study ?? null,
      country: dest ? { id: g!.country_ids[0]!, label: dest } : null,
      origin: origin ? { id: originId!, label: origin } : null,
    },
    ...(forMentor ? { for_mentor_bookable: !!picked } : {}),
  };
}
