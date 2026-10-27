'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { components } from '@/lib/api/generated/schema';
import { HOURS_COPY, introDescription } from '@/lib/copy/mentorOnboarding';
import {
  MENTOR_DEGREES,
  currentSchool,
  defaultSchool,
  mentorDegreeFromSaved,
  fromWeeklyHours,
  headlineFor,
  normaliseLinkedIn,
  schoolCountry,
  toDayHours,
  yearOf,
  yearToApiDate,
} from '@/lib/utils/mentorOnboarding';
import type { AppError } from '@/types/mentor';
import type {
  MentorAnswers,
  MentorApplicationState,
  MentorGap,
  MentorStep,
  MentorStepName,
  SchoolDraft,
} from '@/types/mentorOnboarding';
import { useCountries, useDegreeLevels, type CatalogOption } from './catalog';
import { ApiError, apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { useTopics } from './mentors';
import { aboutBody } from './profileEdit';
import type { SessionTypeWriteBody } from './sessionTypes';
import { STARTER_COPY } from '@/lib/copy/sessionTypes';
import { toWeeklyHours, useSaveWeeklyHours, useWeeklyHours, type WeeklyHours } from './weeklyHours';

type Me = components['schemas']['UserRead'];
type EducationRead = Me['education'][number];
type EducationWrite = components['schemas']['EducationWrite'];

type Stamps = Pick<NonNullable<Me['mentor_profile']>, 'submitted_at' | 'approved_seen_at'>;
type Result = { error?: unknown; response: Response };

/** A field an older backend doesn't send counts as set; null means not yet. */
const stamped = (mp: Stamps, k: keyof Stamps) => !(k in mp) || !!mp[k];

export const STEP_NAMES: Record<MentorStep, MentorStepName> = {
  help: 'mentor_help',
  education: 'mentor_education',
  about: 'mentor_about',
  hours: 'mentor_hours',
};

const stepFromName = (s: unknown): MentorStep | null =>
  (Object.keys(STEP_NAMES) as MentorStep[]).find((k) => STEP_NAMES[k] === s) ?? null;

export const INTRO_CHAT = HOURS_COPY.introName;

/** The device's zone, or null when it can't be read (the UTC fallback note). */
function readZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

const idByCode = (countries: CatalogOption[], code: string | null | undefined) =>
  code ? (countries.find((c) => c.code === code)?.id ?? '') : '';

function schoolFromSaved(
  e: EducationRead,
  countries: CatalogOption[],
  studyCountryId: string,
): SchoolDraft {
  const catalogCountryId = idByCode(countries, e.institution?.country?.code) || null;
  // Only the current school's country is kept (as the mentor's study country):
  // a typed school, or a "Change" away from the catalogue's, reads it back.
  const countryId =
    e.is_most_recent && studyCountryId && studyCountryId !== catalogCountryId ? studyCountryId : '';
  return {
    key: e.id,
    id: e.id,
    school: e.school_name_raw,
    institutionId: e.institution?.id ?? null,
    catalogCountryId,
    countryId,
    countryOpen: !!countryId && !!catalogCountryId,
    degree: mentorDegreeFromSaved(e.degree_abbreviation, e.degree_level?.code),
    field: e.study_course ?? '',
    start: yearOf(e.date_start),
    end: yearOf(e.date_end),
    current: e.is_most_recent,
  };
}

const STATUSES = ['pending', 'approved', 'declined'] as const;
const toStatus = (s: string | null | undefined): MentorApplicationState['approvalStatus'] =>
  STATUSES.find((x) => x === s) ?? null;

export type ApplicationContext = {
  countries: CatalogOption[];
  hours: WeeklyHours | null;
  /** Known session type names, when loaded; the hours save checks again itself. */
  sessionTypeNames?: string[];
  deviceZone: string | null;
};

/** Everything the four steps hold, rebuilt from the server (PRD F1: resume on any device). */
export function toApplicationState(me: Me, ctx: ApplicationContext): MentorApplicationState {
  const mp = me.mentor_profile ?? null;
  const studyCountryId = idByCode(ctx.countries, mp?.primary_study_country?.code);
  const schools = (me.education ?? []).map((e) =>
    schoolFromSaved(e, ctx.countries, studyCountryId),
  );
  if (!schools.length) schools.push(defaultSchool(true));
  else if (!schools.some((s) => s.current)) schools[0]!.current = true;

  const savedZone = ctx.hours?.rules.length ? ctx.hours.timeZone : null;
  const profileZone = me.timezone && me.timezone !== 'UTC' ? me.timezone : null;
  const timeZone = savedZone ?? ctx.deviceZone ?? profileZone ?? 'UTC';
  const hours = fromWeeklyHours(ctx.hours);

  const answers: MentorAnswers = {
    helpIds: (mp?.offerings ?? []).map((o) => o.id),
    schools,
    photoUrl: me.profile?.avatar_url ?? null,
    originId: idByCode(ctx.countries, me.profile?.origin_country?.code),
    linkedin: me.profile?.social_linkedin ?? '',
    about: me.profile?.about_me ?? '',
    aboutDrafted: !!me.profile?.about_me_drafted_at,
    aboutPromptVersion: null,
    days: hours.days,
    from: hours.from,
    to: hours.to,
    timeZone,
    timeZoneFallback: !savedZone && !ctx.deviceZone && !profileZone,
  };
  return {
    answers,
    lastStep: stepFromName(me.onboarding?.last_step),
    hasProfile: mp !== null,
    submitted: mp ? stamped(mp, 'submitted_at') : false,
    approvalStatus: toStatus(mp?.approval_status),
    approvedSeen: mp ? stamped(mp, 'approved_seen_at') : false,
    hasIntroChat: (ctx.sessionTypeNames ?? []).some(
      (n) => n.trim().toLowerCase() === INTRO_CHAT.toLowerCase(),
    ),
    firstName: me.first_name ?? '',
    email: me.email,
    handle: me.slug ?? null,
  };
}

/**
 * The applicant's answers and standing (GET /me, plus their weekly hours and
 * session types). Countries map the saved country codes back to ids.
 */
export function useMentorApplication(userId: string | null) {
  const countries = useCountries(userId !== null);
  const me = useQuery({
    queryKey: keys.mentorApplication.me(userId ?? 'none'),
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET('/api/v1/me', { signal });
      if (!data) throw new ApiError(response.status);
      return data;
    },
    enabled: userId !== null,
    retry: retryOnce,
  });
  const hours = useWeeklyHours(userId);
  const [deviceZone] = useState(readZone);

  // Session types aren't read here: step 1 creates the profile they hang off,
  // and loading must never wait on them (the hours save checks for itself).
  const ready = !!me.data && countries.status === 'ready' && !!hours.data;
  const error =
    (me.error ? normaliseError(me.error) : null) ??
    (countries.status === 'error' ? normaliseError(new ApiError(0)) : null) ??
    hours.error;
  return {
    state: ready
      ? toApplicationState(me.data!, {
          countries: countries.countries,
          hours: hours.data,
          deviceZone,
        })
      : null,
    countries: countries.countries,
    isLoading: userId !== null && !ready && !error,
    error,
    retry: () => {
      void me.refetch();
      countries.retry();
      hours.retry();
    },
  };
}

export type InstitutionOption = {
  id: string;
  name: string;
  countryId: string | null;
  countryLabel: string | null;
};

/** University suggestions (GET /institutions?q=), 250ms after typing stops. */
export function useInstitutionSearch(q: string, countries: CatalogOption[]) {
  const [term, setTerm] = useState(q.trim());
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const query = useQuery({
    queryKey: keys.mentorApplication.institutions(term),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/institutions', {
        params: { query: { q: term, limit: 8 } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return data.data;
    },
    enabled: term.length >= 2,
    staleTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const options: InstitutionOption[] = (term.length >= 2 ? (query.data ?? []) : []).map((i) => ({
    id: i.id,
    name: i.name,
    countryId: idByCode(countries, i.country?.code) || null,
    countryLabel: i.country?.display_name ?? null,
  }));
  return {
    options,
    /** What `options` answer: the debounced text, behind what's typed. */
    term,
    isLoading: query.isFetching,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}

// ---- saving ------------------------------------------------------------------

type EducationBody = Required<
  Pick<
    EducationWrite,
    | 'school_name_raw'
    | 'institution_id'
    | 'degree_level_id'
    | 'degree_abbreviation'
    | 'study_course'
    | 'date_start'
    | 'date_end'
    | 'is_most_recent'
  >
>;

/** A chip whose level the catalogue doesn't list: never saved as "no level". */
export class LevelMissingError extends Error {}

/**
 * The body a school saves as. With `was`, what the step can't show is kept:
 * the saved day and month while the year is unchanged, and the saved
 * abbreviation (e.g. "MSc") while the chip still reads the same.
 */
export function educationBody(
  s: SchoolDraft,
  levels: { id: string; code: string }[],
  was?: EducationRead,
): EducationBody {
  const d = MENTOR_DEGREES.find((x) => x.value === s.degree);
  const levelId = d ? levels.find((l) => l.code === d.code)?.id : undefined;
  if (d && !levelId) throw new LevelMissingError(d.code);
  const sameChip =
    !!was && mentorDegreeFromSaved(was.degree_abbreviation, was.degree_level?.code) === s.degree;
  return {
    school_name_raw: s.school.trim(),
    institution_id: s.institutionId,
    degree_level_id: levelId ?? null,
    degree_abbreviation: sameChip ? (was!.degree_abbreviation ?? null) : (d?.raw ?? null),
    study_course: s.field.trim(),
    date_start: yearToApiDate(s.start, was?.date_start ?? null, 'start'),
    date_end: yearToApiDate(s.end, was?.date_end ?? null, 'end'),
    is_most_recent: s.current,
  };
}

function savedBody(e: EducationRead): EducationBody {
  return {
    school_name_raw: e.school_name_raw,
    institution_id: e.institution?.id ?? null,
    degree_level_id: e.degree_level?.id ?? null,
    degree_abbreviation: e.degree_abbreviation ?? null,
    study_course: e.study_course ?? '',
    date_start: e.date_start ?? null,
    date_end: e.date_end ?? null,
    is_most_recent: e.is_most_recent,
  };
}

/** What to delete, change and add to turn the saved degrees into the step's schools. */
export function planEducation(
  saved: EducationRead[],
  schools: SchoolDraft[],
  levels: { id: string; code: string }[],
) {
  const remove = saved.filter((e) => !schools.some((s) => s.id === e.id)).map((e) => e.id);
  const edit: { id: string; body: Partial<EducationBody> }[] = [];
  const add: { key: string; body: EducationBody }[] = [];
  for (const s of schools) {
    const was = s.id ? saved.find((e) => e.id === s.id) : undefined;
    const body = educationBody(s, levels, was);
    if (!was) {
      add.push({ key: s.key, body });
      continue;
    }
    const before = savedBody(was);
    const changed = Object.fromEntries(
      (Object.keys(body) as (keyof EducationBody)[])
        .filter((k) => body[k] !== before[k])
        .map((k) => [k, body[k]]),
    ) as Partial<EducationBody>;
    if (Object.keys(changed).length) edit.push({ id: was.id, body: changed });
  }
  // Clearing "current" goes before setting it on another, so two are never current at once.
  edit.sort(
    (a, b) => Number(a.body.is_most_recent === true) - Number(b.body.is_most_recent === true),
  );
  return { remove, edit, add };
}

/** The fields a step's 422 can name (Problem Details `errors[].pointer`), as the step's gaps. */
const REFUSED: Record<string, MentorGap> = {
  '/social_linkedin': 'linkedinFormat',
  '/origin_country_id': 'origin',
};

/**
 * The step gaps a 422 names. None unless every refused field has a place on
 * the step: one with nowhere to show must keep the general notice.
 */
export function refusedFields(body: unknown): MentorGap[] {
  const errors = (body as { errors?: unknown } | null)?.errors;
  if (!Array.isArray(errors) || !errors.length) return [];
  const gaps = errors.map((e) => REFUSED[(e as { pointer?: unknown } | null)?.pointer as string]);
  return gaps.every(Boolean) ? (gaps as MentorGap[]) : [];
}

/** A refusal that names fields the step shows: each error goes under its field. */
export class FieldsRefused extends ApiError {
  constructor(readonly fields: MentorGap[]) {
    super(422, 'Unprocessable Content');
  }
}

async function check(p: Promise<Result>, okStatus?: number) {
  const { error, response } = await p;
  if (response.ok || response.status === okStatus) return;
  const fields = response.status === 422 ? refusedFields(error) : [];
  if (fields.length) throw new FieldsRefused(fields);
  throw apiError(response.status, error, response);
}

async function saveStepName(step: MentorStep) {
  await check(api.PUT('/api/v1/me/onboarding', { body: { last_step: STEP_NAMES[step] } }));
}

export type StepSaveError = AppError & {
  /** The submit refusal's codes, in step order (PRD B2 `missing_items`). */
  missing?: string[];
  /** Already approved or declined: the status page says what's next. */
  decided?: boolean;
};

/** One Intro chat create per attempt (backend keeps keys 24 h per user and key). */
export const introChatKey = (userId: string, attempt: string) => `intro-chat-${userId}-${attempt}`;

const newAttempt = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Whether the mentor already has an Intro chat: the starter (it may have been
 * renamed), or one by its name. No profile yet (404) means none.
 */
async function hasIntroChat(): Promise<boolean> {
  const { data, error, response } = await api.GET('/api/v1/me/session-types');
  if (response.status === 404) return false;
  if (!data) throw apiError(response.status, error, response);
  return data.data.some(
    (t) => t.is_starter || t.name.trim().toLowerCase() === INTRO_CHAT.toLowerCase(),
  );
}

/** The owner's saved degrees, fresh: a stale cache would re-add or delete what a retry just made. */
async function readEducation(userId: string): Promise<EducationRead[]> {
  const { data, error, response } = await api.GET('/api/v1/users/{user_id}/education', {
    params: { path: { user_id: userId } },
  });
  if (!data) throw apiError(response.status, error, response);
  return data.data;
}

/**
 * Each step's Continue: its answers, then `last_step` (PRD F1). Every write is
 * a replace or a diff against what the server holds, so a retried Continue
 * never adds a second degree, rule or Intro chat.
 */
export function useSaveMentorStep(userId: string | null) {
  const qc = useQueryClient();
  const levels = useDegreeLevels(userId !== null);
  const topics = useTopics();
  const hours = useWeeklyHours(userId);
  const saveHours = useSaveWeeklyHours(userId);

  // Retries in one attempt reuse the key; a new visit or new help areas get a new one.
  const attempt = useRef<{ help: string; id: string } | null>(null);

  const mutation = useMutation<
    void,
    unknown,
    {
      step: MentorStep;
      answers: MentorAnswers;
      state: MentorApplicationState;
      onSchoolSaved?: (key: string, id: string) => void;
    }
  >({
    mutationFn: async ({ step, answers, state, onSchoolSaved }) => {
      if (!userId) throw new ApiError(401);
      const user = { user_id: userId };
      const me = qc.getQueryData<Me>(keys.mentorApplication.me(userId));
      const patchMentor = (body: components['schemas']['MentorProfileWrite']) =>
        check(
          api.PATCH('/api/v1/users/{user_id}/mentor-profile', { params: { path: user }, body }),
        );
      const patchProfile = (body: components['schemas']['UserProfileWrite']) =>
        check(api.PATCH('/api/v1/users/{user_id}/profile', { params: { path: user }, body }));

      if (step === 'help') {
        const body = { offering_ids: answers.helpIds };
        if (state.hasProfile || me?.mentor_profile) await patchMentor(body);
        else {
          const res = await api.POST('/api/v1/users/{user_id}/mentor-profile', {
            params: { path: user },
            body,
          });
          // Created by an earlier try whose reply was lost: update it instead.
          if (res.response.status === 409) await patchMentor(body);
          else if (!res.response.ok) throw apiError(res.response.status, res.error, res.response);
        }
      }

      if (step === 'education') {
        if (levels.status !== 'ready') {
          levels.retry();
          throw new ApiError(0);
        }
        const plan = planEducation(await readEducation(userId), answers.schools, levels.levels);
        for (const id of plan.remove)
          await check(
            api.DELETE('/api/v1/users/{user_id}/education/{entry_id}', {
              params: { path: { ...user, entry_id: id } },
            }),
            404,
          );
        for (const { id, body } of plan.edit)
          await check(
            api.PATCH('/api/v1/users/{user_id}/education/{entry_id}', {
              params: { path: { ...user, entry_id: id } },
              body,
            }),
          );
        for (const { key, body } of plan.add) {
          const res = await api.POST('/api/v1/users/{user_id}/education', {
            params: { path: user },
            body,
          });
          if (!res.response.ok) throw apiError(res.response.status, res.error, res.response);
          // Each as it lands: a later failure must not leave this one to be added twice.
          if (res.data?.id) onSchoolSaved?.(key, res.data.id);
        }
        // Matching's top signal, and what the About draft reads (PRD F1, B2).
        const cur = currentSchool(answers.schools);
        await patchMentor({
          primary_study_country_id: (cur && schoolCountry(cur)) || null,
          primary_study_program: cur?.field.trim() || null,
        });
      }

      if (step === 'about') {
        await patchProfile({
          origin_country_id: answers.originId,
          social_linkedin: normaliseLinkedIn(answers.linkedin),
          ...aboutBody(answers.about, {
            drafted: answers.aboutDrafted,
            promptVersion: answers.aboutPromptVersion,
          }),
        });
        const headline = headlineFor(currentSchool(answers.schools));
        if (headline) await patchMentor({ headline });
      }

      if (step === 'hours') {
        const current = hours.data ?? toWeeklyHours([], answers.timeZone);
        await saveHours.save({
          current,
          days: toDayHours(answers.days, answers.from, answers.to),
          timeZone: answers.timeZone,
        });
        await patchProfile({ timezone: answers.timeZone });
        const help = [...answers.helpIds].sort().join(',');
        if (attempt.current?.help !== help) attempt.current = { help, id: newAttempt() };
        const key = introChatKey(userId, attempt.current.id);
        if (!(await hasIntroChat())) {
          const labels = answers.helpIds.flatMap(
            (id) => topics.topics.find((t) => t.id === id)?.label ?? [],
          );
          await check(
            api.POST('/api/v1/me/session-types', {
              // One per account: a retry after a lost reply returns the first.
              params: { header: { 'Idempotency-Key': key } },
              body: {
                name: INTRO_CHAT,
                duration_minutes: 30,
                description: introDescription(labels),
                service_offering_ids: answers.helpIds,
                // "Created for you", and its help-area question in sync (backend #540).
                is_starter: true,
                application_stages: ['exploring'],
                questions: [
                  {
                    question_text: STARTER_COPY.talkAbout,
                    question_type: 'free_text',
                    is_required: false,
                    display_order: 0,
                  },
                  {
                    question_text: STARTER_COPY.helpArea,
                    question_type: 'multi_choice',
                    allows_multiple: false,
                    is_required: true,
                    display_order: 1,
                    options_source: 'help_areas',
                  },
                ],
              } as SessionTypeWriteBody,
            }),
            // One starter per mentor (backend PR 540): a 409 means it's already there.
            409,
          );
        }
      }

      await saveStepName(step);
    },
    onSettled: async (_d, _e, { step }) => {
      if (step === 'hours') void qc.invalidateQueries({ queryKey: keys.sessionTypes.all });
      if (step === 'education')
        void qc.invalidateQueries({ queryKey: keys.education(userId ?? '') });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      await qc.invalidateQueries({ queryKey: keys.mentorApplication.all });
    },
  });
  return {
    save: (
      step: MentorStep,
      answers: MentorAnswers,
      state: MentorApplicationState,
      onSchoolSaved?: (key: string, id: string) => void,
    ) => mutation.mutateAsync({ step, answers, state, onSchoolSaved }),
    isPending: mutation.isPending,
    error: mutation.error ? (normaliseError(mutation.error) as StepSaveError) : null,
    reset: mutation.reset,
  };
}

export const INCOMPLETE = '/problems/mentor-application-incomplete';

/** The submit refusal names what's still missing (PRD B2 `missing_items`). */
export class IncompleteApplication extends ApiError {
  constructor(readonly missing: string[]) {
    super(409, 'Mentor application incomplete', INCOMPLETE);
  }
}

export const DECIDED = '/problems/mentor-application-decided';

/** Already approved or declined: nothing to submit. */
export class DecidedApplication extends ApiError {
  constructor() {
    super(409, 'Mentor application decided', DECIDED);
  }
}

/** "Submit application" (PRD B2): alerts the admins once; a repeat is a quiet 200. */
export function useSubmitMentorApplication() {
  const qc = useQueryClient();
  const mutation = useMutation<{ submittedAt: string | null }, unknown, void>({
    mutationFn: async () => {
      const { data, error, response } = await api.POST('/api/v1/me/mentor-application/submit');
      const type = (error as { type?: unknown } | undefined)?.type;
      if (response.status === 409 && type === DECIDED) throw new DecidedApplication();
      if (response.status === 409 && type === INCOMPLETE) {
        const missing = (error as unknown as { missing?: unknown } | undefined)?.missing;
        throw new IncompleteApplication(
          Array.isArray(missing) ? missing.filter((m): m is string => typeof m === 'string') : [],
        );
      }
      if (!response.ok) throw apiError(response.status, error, response);
      return { submittedAt: data?.submitted_at ?? null };
    },
    onSuccess: () => {
      // Dropped, not just marked stale: the status page opens next and must
      // never latch a cached "unsubmitted" (it would send them back here).
      qc.removeQueries({ queryKey: keys.viewer.mentorApplicationAll });
      // And the form's own read: opening /onboarding/mentor again must see it submitted.
      qc.removeQueries({ queryKey: keys.mentorApplication.all });
      // Sign-in routing reads the application from /me too.
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
    },
  });
  const e = mutation.error;
  return {
    submit: () => mutation.mutateAsync(),
    isPending: mutation.isPending,
    error: e
      ? ({
          ...normaliseError(e),
          ...(e instanceof IncompleteApplication ? { missing: e.missing } : {}),
          ...(e instanceof DecidedApplication ? { decided: true } : {}),
        } as StepSaveError)
      : null,
    reset: mutation.reset,
  };
}
