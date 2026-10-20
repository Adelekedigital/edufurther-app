'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEGREE_OPTIONS, NOT_SURE, type MissingKey } from '@/lib/copy/onboarding';
import type { AppError } from '@/types/mentor';
import type { PlanAnswers } from '@/types/onboarding';
import type { CatalogOption } from './catalog';
import { ApiError, apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { patchViewer } from './viewer';
import type { components } from '@/lib/api/generated/schema';
import type { PendingIncomplete } from './pending';

type Me = components['schemas']['UserRead'];
type GoalWrite = components['schemas']['GoalWrite'];

export type OnboardingStep = 'help' | 'plans';

export type OnboardingState = {
  /** The furthest step with saved answers; null when they never started. */
  lastStep: OnboardingStep | null;
  /**
   * Answers brought over from the old platform, never stepped through here
   * (PRD H5): the server's `last_step` is null but they hold answers. False
   * while the server doesn't send `last_step`.
   */
  migrated: boolean;
  complete: boolean;
  needIds: string[];
  plans: PlanAnswers;
};

/** What the server sends, kept so a write never drops what onboarding doesn't show. */
export type Saved = {
  goal: NonNullable<Me['goal']> | null;
  /** The origin's ISO code (`/me` sends a CountryRef, not a catalog id). */
  originCode: string | null;
  /** `GET /me` `onboarding`: whether they finished, what's still owed, and the last step saved here. */
  onboarding: Me['onboarding'] | null;
};

/** The stored goal level back to what the mentee picked: `masters` + raw "MBA" is MBA. */
export function degreeValue(goal: Saved['goal']): string {
  const code = goal?.degree_goal?.code;
  if (!code) return '';
  const raw = goal?.degree_goal_raw?.trim().toUpperCase() ?? null;
  const match =
    DEGREE_OPTIONS.find((d) => d.code === code && d.raw?.toUpperCase() === raw) ??
    DEGREE_OPTIONS.find((d) => d.code === code && d.raw === null);
  return match?.value ?? '';
}

/** Goal countries carry a code, not an id (backend #6 note): matched against the catalog. */
export function toState(saved: Saved, countries: CatalogOption[]): OnboardingState {
  const g = saved.goal;
  const needIds = (g?.needs ?? []).map((n) => n.id);
  const degree = degreeValue(g);
  const field = g?.field_of_study ?? '';
  const answeredPlans = !!degree && !!field.trim();
  const first = [...(g?.countries ?? [])].sort((a, b) => a.priority - b.priority)[0];
  const destinationId = first
    ? (countries.find((c) => c.code === first.code)?.id ?? '')
    : // Plans answered with no country is "Not sure yet"; unanswered is blank.
      answeredPlans
      ? NOT_SURE
      : '';
  const originId = saved.originCode
    ? (countries.find((c) => c.code === saved.originCode)?.id ?? '')
    : '';
  // Done only when the server says so (/me `onboarding`, backend #5). Filled-in
  // answers alone aren't done: completion may never have run, and it pays the
  // starter credit. Until #5 ships they resume at step 2 and finish (idempotent).
  const complete = saved.onboarding?.complete ?? false;
  const answered = needIds.length > 0 || !!degree || !!field.trim() || !!originId;
  // The server's own step once it sends one; until then, read from the answers.
  // A mentor application's step (B3 shares the column) says nothing about the
  // mentee flow: read it as no step known, so the answers decide (never "migrated").
  const rawStep = saved.onboarding?.last_step;
  const serverStep =
    rawStep === null || rawStep === 'help' || rawStep === 'plans' ? rawStep : undefined;
  const known = serverStep !== undefined;
  return {
    lastStep: known ? serverStep : answeredPlans ? 'plans' : needIds.length ? 'help' : null,
    migrated: known && serverStep === null && answered && !complete,
    complete,
    needIds,
    plans: { originId, degree, field, destinationId },
  };
}

/**
 * One read: `GET /me` carries the goal, and (pending) the origin and the
 * onboarding gaps. A signed-in member always gets a 200, so "never started"
 * is an empty goal, not a 404 in the console.
 */
async function readSaved(signal: AbortSignal): Promise<Saved> {
  const { data, response } = await api.GET('/api/v1/me', { signal });
  if (!data) throw new ApiError(response.status);
  return {
    goal: data.goal ?? null,
    originCode: data.profile?.origin_country?.code ?? null,
    onboarding: data.onboarding ?? null,
  };
}

/**
 * Where the mentee got to and what they answered, to resume (PRD F1: from the
 * server, not the device). `countries` maps the goal's country back to an id.
 */
export function useOnboarding(userId: string | null, countries: CatalogOption[]) {
  const query = useQuery({
    queryKey: keys.onboarding.state(userId ?? 'none'),
    queryFn: ({ signal }) => readSaved(signal),
    enabled: userId !== null,
    retry: retryOnce,
  });
  return {
    saved: query.data ?? null,
    state: query.data ? toState(query.data, countries) : null,
    isLoading: userId !== null && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** The refusal names what is missing (backend #3); "Not sure yet" is never missing. */
export type OnboardingError = AppError & { missing?: MissingKey[] };

/** The completion refusal's codes the missing line can name. */
const MISSING_CODES = new Set<MissingKey>(['help', 'origin', 'degree', 'field']);

function toOnboardingError(e: unknown): OnboardingError {
  const base = normaliseError(e);
  if (e instanceof IncompleteError) return { ...base, missing: e.missing };
  return base;
}

class IncompleteError extends ApiError {
  constructor(readonly missing: MissingKey[]) {
    super(409, 'Onboarding incomplete', '/problems/onboarding-incomplete');
  }
}

type Answers = { needIds: string[]; plans?: PlanAnswers };

/** A chosen degree the catalog can't place: never save it as "no degree". */
export class LevelMissingError extends Error {}

/**
 * A picked degree as the goal stores it (PRD H8): MBA is the Master's level
 * with raw "MBA". Throws when the catalogue has no such level.
 */
export function degreeWrite(
  degree: string,
  levels: { id: string; code: string }[],
): Pick<GoalWrite, 'degree_goal_id' | 'degree_goal_raw'> {
  const d = DEGREE_OPTIONS.find((o) => o.value === degree);
  const levelId = d ? levels.find((l) => l.code === d.code)?.id : undefined;
  if (d && !levelId) throw new LevelMissingError(d.code);
  return { degree_goal_id: levelId ?? null, degree_goal_raw: d?.raw ?? null };
}

/**
 * The goal as PUT wants it. PUT replaces the goal, so every known answer goes
 * every time: step 1 carries the saved degree and countries forward, step 2
 * replaces the first country and keeps the others (Settings may hold up to 3).
 * `field_of_study` is left out on step 1: omitted means unchanged (backend #1).
 */
export function goalBody(
  saved: Saved | null,
  a: Answers,
  levels: { id: string; code: string }[],
  countries: CatalogOption[],
): GoalWrite {
  const g = saved?.goal;
  const savedCountryIds = [...(g?.countries ?? [])]
    .sort((x, y) => x.priority - y.priority)
    .flatMap((c) => countries.find((k) => k.code === c.code)?.id ?? []);
  const body: GoalWrite = {
    // Kept as they are: onboarding doesn't ask these.
    target_start_term: g?.target_start_term ?? null,
    notes: g?.notes ?? null,
    need_ids: a.needIds,
  };
  if (!a.plans) {
    body.degree_goal_id = g?.degree_goal?.id ?? null;
    body.degree_goal_raw = g?.degree_goal_raw ?? null;
    body.country_ids = savedCountryIds;
    return body;
  }
  Object.assign(body, degreeWrite(a.plans.degree, levels));
  body.field_of_study = a.plans.field.trim();
  const rest = savedCountryIds.slice(1);
  const dest = a.plans.destinationId;
  body.country_ids = dest && dest !== NOT_SURE ? [dest, ...rest.filter((id) => id !== dest)] : rest;
  return body;
}

export async function putGoal(userId: string, body: GoalWrite) {
  const { error, response } = await api.PUT('/api/v1/users/{user_id}/goal', {
    params: { path: { user_id: userId } },
    body,
  });
  if (!response.ok) throw apiError(response.status, error, response);
}

async function saveStep(last_step: OnboardingStep) {
  const { error, response } = await api.PUT('/api/v1/me/onboarding', { body: { last_step } });
  if (!response.ok) throw apiError(response.status, error, response);
}

/**
 * Step 1's Continue: the help areas, then `last_step='help'` (PRD US-2). Step 2's
 * "See my matches": origin (profile), the goal, `last_step='plans'`, then
 * completion (PRD US-3), which is idempotent and pays the starter credit once.
 */
export function useSaveOnboarding(
  userId: string | null,
  saved: Saved | null,
  levels: { id: string; code: string }[],
  countries: CatalogOption[],
) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (a: Answers & { step: OnboardingStep }) => {
      if (!userId) throw new ApiError(401);
      if (a.step === 'plans' && a.plans) {
        const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
          params: { path: { user_id: userId } },
          body: { origin_country_id: a.plans.originId },
        });
        if (!response.ok) throw apiError(response.status, error, response);
      }
      await putGoal(userId, goalBody(saved, a, levels, countries));
      await saveStep(a.step);
      if (a.step !== 'plans') return;
      const { error, response } = await api.POST('/api/v1/me/onboarding/completion');
      if (response.status === 409) {
        const codes = (error as PendingIncomplete | undefined)?.missing;
        const missing = Array.isArray(codes)
          ? codes.filter((c): c is MissingKey => MISSING_CODES.has(c as MissingKey))
          : [];
        throw new IncompleteError(missing);
      }
      if (!response.ok) throw apiError(response.status, error, response);
    },
    onSuccess: (_d, a) => {
      // Where they are in onboarding changed: /me (and the setup lock) follows.
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
      if (a.step !== 'plans') return;
      // Done: no setup lock on the way Home, before /me comes back.
      patchViewer(qc, { onboardingComplete: true });
      // New answers, new ranking: never show the last answers' matches first.
      qc.removeQueries({ queryKey: keys.onboarding.matchesAll });
      // Completion pays the starter credit and the origin changed: Home refreshes too.
      void qc.invalidateQueries({ queryKey: keys.menteeHome.all });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.onboarding.all });
    },
  });
  return {
    save: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? toOnboardingError(mutation.error) : null,
    reset: mutation.reset,
  };
}
