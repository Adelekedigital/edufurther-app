'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AssistMode } from '@/components/molecules/AiField/AiField';
import { useAvatarUpload } from '@/lib/api/data/avatar';
import { useRememberMentorSignup } from '@/lib/api/data/roleHooks';
import { useFieldsOfStudy } from '@/lib/api/data/catalog';
import {
  DECIDED,
  useMentorApplication,
  useSaveMentorStep,
  useSubmitMentorApplication,
} from '@/lib/api/data/mentorApplication';
import { useTopics } from '@/lib/api/data/mentors';
import { useViewer } from '@/lib/api/data/viewer';
import { requestAssist } from '@/lib/api/data/writingAssist';
import { FLOW_COPY, STEP_ORDER } from '@/lib/copy/mentorOnboarding';
import { FIELD_SUGGESTIONS } from '@/lib/copy/onboarding';
import { deviceTimeZone } from '@/lib/utils/format';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import {
  DEFAULT_FROM,
  DEFAULT_TO,
  defaultSchool,
  gapsFor,
  isLinkedInProfile,
  moveFrom,
} from '@/lib/utils/mentorOnboarding';
import type {
  MentorAnswers,
  MentorApplicationState,
  MentorGap,
  MentorStep,
} from '@/types/mentorOnboarding';
import { ABOUT_IDS } from './AboutStep';
import { firstEducationField } from './EducationStep';
import { HELP_FIRST_ID } from './HelpAreasStep';
import { FIRST_DAY_ID } from './HoursStep';

/** A first About draft that takes longer counts as failed (handoff: 8 s). */
export const DRAFT_TIMEOUT_MS = 8000;

/** Room above a focused field, so the pinned footer never covers it on phones. */
const FOCUS_OFFSET = 96;

type Form = {
  step: MentorStep;
  answers: MentorAnswers;
  /** Came back to an unfinished application: the welcome-back banner. */
  resumed: boolean;
  /** The standing the form was seeded from, while a refetch is in flight. */
  base: MentorApplicationState;
};

/** The submit refusal's codes (PRD B2 `missing`) → the step and field to send them to. */
/** The answer each gap is about. */
const GAP_FIELD: Record<MentorGap, keyof MentorAnswers> = {
  help: 'helpIds',
  education: 'schools',
  studyCountry: 'schools',
  photo: 'photoUrl',
  origin: 'originId',
  linkedin: 'linkedin',
  linkedinFormat: 'linkedin',
  days: 'days',
};

const MISSING: Record<string, { step: MentorStep; gap: MentorGap | null }> = {
  offerings: { step: 'help', gap: 'help' },
  education: { step: 'education', gap: 'education' },
  primary_study_country: { step: 'education', gap: 'studyCountry' },
  // Built from the current school, so that's where it's fixed.
  headline: { step: 'education', gap: 'education' },
  avatar: { step: 'about', gap: 'photo' },
  origin_country: { step: 'about', gap: 'origin' },
  social_linkedin: { step: 'about', gap: 'linkedin' },
  availability: { step: 'hours', gap: 'days' },
  session_type: { step: 'hours', gap: null },
};

/** What the leave guard compares: saved ids aren't the applicant's edits. */
const snapshot = (a: MentorAnswers) =>
  JSON.stringify({ ...a, schools: a.schools.map((x) => ({ ...x, id: null })) });

const next = (s: MentorStep) =>
  STEP_ORDER[Math.min(STEP_ORDER.indexOf(s) + 1, STEP_ORDER.length - 1)]!;
const prev = (s: MentorStep) => STEP_ORDER[Math.max(STEP_ORDER.indexOf(s) - 1, 0)]!;

/** Focus a field and bring it above the pinned footer (scrollTo, not scrollIntoView). */
function focusField(id: string | null) {
  const el = id ? document.getElementById(id) : null;
  if (!el) return;
  el.focus({ preventScroll: true });
  const top = el.getBoundingClientRect().top + window.scrollY - FOCUS_OFFSET;
  window.scrollTo({ top: Math.max(0, top) });
}

function gapField(gap: MentorGap, a: MentorAnswers): string | null {
  switch (gap) {
    case 'help':
      return HELP_FIRST_ID;
    case 'education':
    case 'studyCountry':
      return firstEducationField(a.schools, gap);
    case 'photo':
      return ABOUT_IDS.photo;
    case 'origin':
      return ABOUT_IDS.origin;
    case 'linkedin':
    case 'linkedinFormat':
      return ABOUT_IDS.linkedin;
    case 'days':
      return FIRST_DAY_ID;
  }
}

/** Nothing typed yet: what Start over goes back to (the photo stays on the account). */
function freshAnswers(a: MentorAnswers): MentorAnswers {
  return {
    ...a,
    helpIds: [],
    schools: [defaultSchool(true)],
    originId: '',
    linkedin: '',
    about: '',
    aboutDrafted: false,
    aboutPromptVersion: null,
    days: [],
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  };
}

/**
 * The mentor application's state: who is here, their answers (from the
 * server, PRD F1), which step shows, each step's save, the first About draft
 * and submit. The page renders it.
 */
export function useMentorOnboardingFlow() {
  const viewer = useViewer();
  const router = useRouter();
  // Arriving with `role=mentor` (a sign-up link): the account remembers it.
  useRememberMentorSignup(viewer, useSearchParams().get('role'));
  // Approved mentors too: whether they've seen the approved screen decides where they go.
  const member = viewer.kind === 'member' ? viewer : null;
  const userId = member?.id ?? null;

  const app = useMentorApplication(userId);
  const save = useSaveMentorStep(userId);
  const submit = useSubmitMentorApplication();
  const topics = useTopics();
  const fields = useFieldsOfStudy(userId !== null);
  const photo = useAvatarUpload(app.state?.handle ?? '', userId);
  const [deviceZone] = useState(deviceTimeZone);

  const [form, setForm] = useState<Form | null>(null);
  // What the server holds, as the form last matched it: the leave guard's baseline.
  const [baseline, setBaseline] = useState<MentorAnswers | null>(null);
  const [tried, setTried] = useState(false);
  // Gaps the submit refusal named that the answers on screen can't show (e.g. a photo removed elsewhere).
  const [serverGaps, setServerGaps] = useState<MentorGap[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftFailed, setDraftFailed] = useState(false);
  const draftedOnce = useRef(false);
  const promptVersion = useRef<string | null>(null);

  const state = app.state;
  // A failed help-areas list is a load error, never a step 1 with no chips.
  const ready = !!state && !topics.isLoading && !topics.error;
  const decided = state?.approvalStatus === 'declined' || state?.approvalStatus === 'approved';
  // In review: the reviewed answers are frozen until the decision (owner, 18 Oct).
  const inReview = state?.approvalStatus === 'pending' && state.submitted;
  if (form === null && ready && !decided && !inReview) {
    const last = state.lastStep;
    const step = last === null ? 'help' : next(last);
    setForm({
      step,
      answers: state.answers,
      resumed: last !== null,
      base: state,
    });
    setBaseline(state.answers);
  }

  // A new photo is on the account: the upload's own answer carries it.
  const [photoStamp, setPhotoStamp] = useState(photo.uploadedStamp);
  if (photo.uploadedStamp !== photoStamp) {
    setPhotoStamp(photo.uploadedStamp);
    const url = photo.uploadedUrl;
    if (url) {
      setForm((f) => (f ? { ...f, answers: { ...f.answers, photoUrl: url } } : f));
      // Already on the account: not an unsaved change.
      setBaseline((b) => (b ? { ...b, photoUrl: url } : b));
      // A refused submit's "Add a profile photo." is answered now.
      setServerGaps((g) => g.filter((x) => x !== 'photo'));
    }
  }

  // Not an applicant here: a guest signs up first; one in review or declined reads the
  // status page; an approved one sees the approved screen once, then has a dashboard.
  useEffect(() => {
    if (viewer.kind === 'guest')
      router.replace(`/signup?next=${encodeURIComponent('/onboarding/mentor')}`);
    else if (viewer.kind === 'unlinked' || viewer.kind === 'accountExists')
      router.replace('/explore');
  }, [viewer, router]);
  const status = state?.approvalStatus;
  const seen = state?.approvedSeen;
  useEffect(() => {
    if (form !== null) return;
    if (inReview || status === 'declined' || (status === 'approved' && !seen))
      router.replace('/mentor-application');
    else if (status === 'approved') router.replace('/dashboard');
  }, [form, inReview, status, seen, router]);

  const step = form?.step ?? 'help';
  const answers = form?.answers ?? null;

  // The first About draft, on arriving at step 3 with it empty (handoff: never blocks for long).
  const hasForm = form !== null;
  const latest = useRef(form);
  useEffect(() => {
    latest.current = form;
  });
  // Set on every mount: a remount (Strict Mode runs effects twice) must not leave it false.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const f = latest.current;
    if (step !== 'about' || !f || f.answers.about.trim() || draftedOnce.current) return;
    draftedOnce.current = true;
    setDrafting(true);
    setDraftFailed(false);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), DRAFT_TIMEOUT_MS),
    );
    Promise.race([requestAssist('mentor_about', 'draft', ''), timeout])
      .then((r) => {
        if (!mounted.current) return;
        // Words they typed meanwhile win over the draft.
        setForm((cur) =>
          cur && !cur.answers.about.trim()
            ? {
                ...cur,
                answers: {
                  ...cur.answers,
                  about: r.text,
                  aboutDrafted: true,
                  aboutPromptVersion: r.promptVersion,
                },
              }
            : cur,
        );
      })
      .catch(() => mounted.current && setDraftFailed(true))
      .finally(() => mounted.current && setDrafting(false));
  }, [step, hasForm]);

  // Focus moves to the step heading on every step change, never on the first render.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef<string | null>(null);
  const view = form?.step ?? null;
  useEffect(() => {
    if (!view) return;
    if (shown.current !== null && shown.current !== view) {
      window.scrollTo({ top: 0 });
      headingRef.current?.focus({ preventScroll: true });
    }
    shown.current = view;
  }, [view]);

  const dirty = !!form && baseline !== null && snapshot(form.answers) !== snapshot(baseline);
  useLeaveGuard(dirty, FLOW_COPY.leaveLabel);

  const gaps = answers ? gapsFor(step, answers) : [];
  const set = (patch: Partial<MentorAnswers>) => {
    if (save.isPending || submit.isPending) return;
    save.reset();
    submit.reset();
    // A server's error stays until its own field is edited.
    setServerGaps((g) => g.filter((gap) => !(GAP_FIELD[gap] in patch)));
    setForm((f) => (f ? { ...f, answers: { ...f.answers, ...patch } } : f));
  };
  // A school saved on this Continue keeps its new id, so the next save edits it.
  const keepSchoolId = (key: string, id: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            answers: {
              ...f.answers,
              schools: f.answers.schools.map((x) => (x.key === key ? { ...x, id } : x)),
            },
          }
        : f,
    );

  /** The submit refusal: back to the first step it names, with that step's errors showing. */
  const showRefusal = (missing: string[]) => {
    const hits = missing.flatMap((m) => MISSING[m] ?? []);
    const first = hits[0];
    if (!first) return;
    const onStep = hits.filter((h) => h.step === first.step).flatMap((h) => h.gap ?? []);
    setServerGaps(onStep);
    setTried(onStep.length > 0);
    // The generic notice stays only where no field can say it (no session type).
    if (onStep.length) submit.reset();
    setForm((f) => (f ? { ...f, step: first.step } : f));
  };

  const goNext = async () => {
    if (!form || save.isPending || submit.isPending || leaving) return;
    const standing = state ?? form.base;
    if (gaps.length || drafting) {
      setTried(true);
      if (gaps[0]) focusField(gapField(gaps[0], form.answers));
      return;
    }
    setTried(false);
    setServerGaps([]);
    const from = form.step;
    try {
      await save.save(from, form.answers, standing, keepSchoolId);
    } catch (e) {
      // A field the server refused shows under that field, not as the general notice.
      const fields = (e as { fields?: MentorGap[] }).fields;
      if (fields?.length) {
        save.reset();
        setServerGaps(fields);
        setTried(true);
        focusField(gapField(fields[0]!, form.answers));
      }
      return; // Otherwise shown from save.error; the answers stay as typed.
    }
    setSaved(true);
    setBaseline(form.answers);
    if (from !== 'hours') {
      setForm((f) => (f && f.step === from ? { ...f, step: next(from), resumed: false } : f));
      return;
    }
    try {
      await submit.submit();
      // Locked until the page goes, so a second tap can't send it again.
      setLeaving(true);
      // The status page, inside the app: its first arrival says it was sent.
      router.replace('/mentor-application?sent=1');
    } catch (e) {
      const err = e as { status?: number; type?: string; missing?: string[] };
      if (err.type === DECIDED) router.replace('/mentor-application');
      else if (err.missing?.length) showRefusal(err.missing);
      // Otherwise shown from submit.error; Submit tries again.
    }
  };

  // Error before empty, and only before the form exists: a failed refetch later keeps the form.
  const loadError = !form && (!!app.error || !!topics.error);

  return {
    viewer,
    form,
    loadError,
    retryLoad: () => {
      app.retry();
      topics.retry();
    },
    state,
    countries: app.countries,
    topics: topics.topics.flatMap((t) =>
      t.id ? [{ id: t.id, slug: t.slug, label: t.label }] : [],
    ),
    fields: fields ?? FIELD_SUGGESTIONS,
    deviceZone,
    headingRef,
    gaps: tried ? [...new Set([...gaps, ...serverGaps.filter((g) => !gaps.includes(g))])] : [],
    tried,
    drafting,
    draftFailed,
    saved: saved || !!form?.resumed,
    save,
    submit,
    busy: save.isPending || submit.isPending || leaving,
    photo,
    linkedinLooksWrong:
      !!answers && answers.linkedin.trim().length >= 6 && !isLinkedInProfile(answers.linkedin),
    set,
    setFrom: (v: number) => answers && set(moveFrom(answers.from, answers.to, v)),
    setTimeZone: (timeZone: string) => set({ timeZone, timeZoneFallback: false }),
    setAbout: (about: string, drafted: boolean) =>
      set({
        about,
        aboutDrafted: drafted,
        aboutPromptVersion: drafted ? promptVersion.current : null,
      }),
    assist: async (mode: AssistMode, text: string) => {
      const r = await requestAssist('mentor_about', mode, text);
      promptVersion.current = r.promptVersion;
      return r.text;
    },
    next: goNext,
    back: () => {
      if (save.isPending || submit.isPending) return;
      save.reset();
      submit.reset();
      setTried(false);
      setServerGaps([]);
      setForm((f) => (f ? { ...f, step: prev(f.step) } : f));
    },
    startOver: () => {
      if (save.isPending || submit.isPending) return;
      save.reset();
      setTried(false);
      setServerGaps([]);
      // An empty About drafts again on the way back to step 3.
      draftedOnce.current = false;
      // Nothing saved is deleted until they continue again.
      setForm((f) =>
        f ? { ...f, step: 'help', answers: freshAnswers(f.answers), resumed: false } : f,
      );
    },
  };
}
