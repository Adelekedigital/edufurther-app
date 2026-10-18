'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCountries, useDegreeLevels, useFieldsOfStudy } from '@/lib/api/data/catalog';
import { useTopics } from '@/lib/api/data/mentors';
import { useMentorMatches } from '@/lib/api/data/mentorMatches';
import { useMentorProfile } from '@/lib/api/data/profile';
import { useOnboarding, useSaveOnboarding, type OnboardingState } from '@/lib/api/data/onboarding';
import { useViewer } from '@/lib/api/data/viewer';
import { NEW_MENTOR_HOME } from '@/lib/config/auth';
import { HELP_LIMIT, type MissingKey } from '@/lib/copy/onboarding';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { parseGuestBooking } from '@/lib/utils/guestBooking';
import { EMPTY_PLANS, missingHelp, missingPlans } from '@/lib/utils/onboardingAnswers';
import type { PlanAnswers } from '@/types/onboarding';

export type Step = 'help' | 'plans' | 'matches';

type Form = {
  step: Step;
  needIds: string[];
  plans: PlanAnswers;
  /** They came back to an unfinished onboarding: the welcome-back banner shows. */
  resumed: boolean;
  /** Their answers came from the old platform (PRD H5): "We brought over your earlier answers". */
  migrated: boolean;
};

/** PRD F1: "You're already set up…", then Home after 1.2 s. */
export const DONE_REDIRECT_MS = 1200;

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));
const samePlans = (a: PlanAnswers, b: PlanAnswers) =>
  a.originId === b.originId &&
  a.degree === b.degree &&
  a.field.trim() === b.field.trim() &&
  a.destinationId === b.destinationId;

/**
 * The first gap, answers prefilled (PRD H5). Answers save on Continue, so any
 * help area means step 1 is done: step 2 next. None means step 1, even when a
 * migrated mentee already holds their plans.
 */
function startFrom(s: OnboardingState): Form {
  return {
    step: s.needIds.length ? 'plans' : 'help',
    // Not capped here: a migrated mentee may hold more than 3; the cap applies to new picks (PRD H5).
    needIds: s.needIds,
    plans: s.plans,
    resumed: s.lastStep !== null && !s.migrated,
    migrated: s.migrated,
  };
}

/**
 * The onboarding flow's state: who is here, what they answered (from the
 * server, PRD F1), which step shows, and the two saves. The page renders it.
 */
export function useOnboardingFlow() {
  const viewer = useViewer();
  const router = useRouter();
  const member = viewer.kind === 'member' && !viewer.isMentor ? viewer : null;
  const userId = member?.id ?? null;
  // A guest back from Book (PRD US-6), read once and checked before it's trusted.
  const search = useSearchParams();
  const [guest] = useState(() => parseGuestBooking(new URLSearchParams(search.toString())));
  const guestProfile = useMentorProfile(guest?.handle ?? null);
  const guestMentor = guestProfile.data?.mentor ?? null;

  const countries = useCountries(member !== null);
  const levels = useDegreeLevels(member !== null);
  const topics = useTopics();
  const fields = useFieldsOfStudy(member !== null);
  const ob = useOnboarding(userId, countries.countries);
  const save = useSaveOnboarding(userId, ob.saved, levels.levels, countries.countries);

  // Seeded once, when the saved answers and every list the steps need are in:
  // countries (to map the saved ones), levels (a degree saved before them would
  // go out as none) and the help areas (step 1 must never render without cards).
  const [form, setForm] = useState<Form | null>(null);
  const [doneAtLoad, setDoneAtLoad] = useState(false);
  // A guest's mentor too, so the banner and the last button's name never pop in under them.
  const ready =
    countries.status === 'ready' &&
    levels.status === 'ready' &&
    !topics.isLoading &&
    // Only with a guest: with no handle the read is disabled, and a disabled
    // query reads as loading forever.
    !(guest && guestProfile.isLoading);
  if (form === null && !doneAtLoad && ob.state && ready) {
    if (ob.state.complete) setDoneAtLoad(true);
    else setForm(startFrom(ob.state));
  }

  // Not a mentee here: a guest signs up first, a mentor has their own home.
  useEffect(() => {
    // Back here after sign-up, with a guest's for/sid/time kept.
    if (viewer.kind === 'guest')
      router.replace(
        `/signup?next=${encodeURIComponent(`/onboarding/mentee${window.location.search}`)}`,
      );
    else if (viewer.kind === 'member' && viewer.isMentor) router.replace(NEW_MENTOR_HOME);
    else if (viewer.kind === 'unlinked' || viewer.kind === 'accountExists')
      router.replace('/explore');
  }, [viewer, router]);

  useEffect(() => {
    if (!doneAtLoad) return;
    const t = setTimeout(() => router.replace('/home'), DONE_REDIRECT_MS);
    return () => clearTimeout(t);
  }, [doneAtLoad, router]);

  const step = form?.step ?? 'help';
  const matches = useMentorMatches(userId, topics.topics, levels.levels, {
    enabled: step === 'matches',
    forMentor: guest?.handle ?? null,
  });

  const dirty =
    !!form &&
    !!ob.state &&
    step !== 'matches' &&
    (!sameIds(form.needIds, ob.state.needIds) || !samePlans(form.plans, ob.state.plans));
  useLeaveGuard(dirty, 'your answers');

  // Focus moves to the step heading on every step change (PRD F1), never on the first render.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef<Step | null>(null);
  useEffect(() => {
    if (!form) return;
    if (shown.current !== null && shown.current !== form.step) {
      window.scrollTo({ top: 0 });
      headingRef.current?.focus({ preventScroll: true });
    }
    shown.current = form.step;
  }, [form]);

  const gaps: MissingKey[] = !form
    ? []
    : form.step === 'help'
      ? missingHelp(form.needIds)
      : form.step === 'plans'
        ? missingPlans(form.plans)
        : [];

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  // Continue was pressed with answers missing: their errors show, and clear
  // one by one as each is answered (design `fieldGuide=marked`).
  const [tried, setTried] = useState(false);

  /** Saves the step, or returns the gaps that stop it (the page moves focus to the first). */
  const next = async (): Promise<MissingKey[]> => {
    if (!form || save.isPending) return [];
    if (gaps.length) {
      setTried(true);
      return gaps;
    }
    setTried(false);
    const from = form.step;
    try {
      if (from === 'help') await save.save({ step: 'help', needIds: form.needIds });
      else if (from === 'plans')
        await save.save({ step: 'plans', needIds: form.needIds, plans: form.plans });
      else return [];
      // Only if they're still where they saved from (Back can't be pressed mid-save, but stay safe).
      setForm((f) =>
        f && f.step === from
          ? { ...f, step: from === 'help' ? 'plans' : 'matches', resumed: false, migrated: false }
          : f,
      );
    } catch (e) {
      // Shown from save.error; the answers stay as typed. A refusal that names
      // gaps marks the step like a local one, so its errors also clear as each
      // is answered, and focus goes to the first (PRD B3).
      const missing = (e as { missing?: MissingKey[] }).missing;
      if (missing?.length) {
        setTried(true);
        return missing;
      }
    }
    return [];
  };

  // Error before empty, but only before the form exists: a failed background
  // refetch later must not replace a form in progress.
  const loadError =
    !form &&
    (!!ob.error || countries.status === 'error' || levels.status === 'error' || !!topics.error);

  return {
    viewer,
    guest,
    guestMentor,
    fields,
    form,
    doneAtLoad,
    loadError,
    retryLoad: () => {
      ob.retry();
      countries.retry();
      levels.retry();
      topics.retry();
    },
    countries: countries.countries,
    topics: topics.topics,
    helpLimit: HELP_LIMIT,
    gaps,
    tried,
    save,
    matches,
    headingRef,
    // While a save runs the answers are what is being saved: edits wait.
    setNeeds: (needIds: string[]) => {
      if (save.isPending) return;
      save.reset();
      set({ needIds });
    },
    setPlans: (plans: PlanAnswers) => {
      if (save.isPending) return;
      save.reset();
      set({ plans });
    },
    next,
    back: () => {
      if (save.isPending) return;
      save.reset();
      setTried(false);
      set({ step: 'help' });
    },
    edit: () => {
      save.reset();
      setTried(false);
      set({ step: 'help', resumed: false, migrated: false });
    },
    startOver: () => {
      if (save.isPending) return;
      save.reset();
      // Nothing saved is deleted until they continue again (PRD F1).
      setTried(false);
      set({ step: 'help', needIds: [], plans: EMPTY_PLANS, resumed: false, migrated: false });
    },
  };
}
