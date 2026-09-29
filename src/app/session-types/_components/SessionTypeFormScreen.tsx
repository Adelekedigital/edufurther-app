'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { BookingPreferencesForm } from '@/components/organisms/SessionTypeWizard/BookingPreferencesForm';
import {
  SessionTypeWizard,
  type Step,
} from '@/components/organisms/SessionTypeWizard/SessionTypeWizard';
import { WeeklyHoursForm } from '@/components/organisms/SessionTypeWizard/WeeklyHoursForm';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useTopics } from '@/lib/api/data/mentors';
import {
  autoIcon,
  useCreateSessionType,
  useMentorDefaults,
  useRetryWindows,
  useSaveMentorDefaults,
  type CreateError,
  type Created,
} from '@/lib/api/data/sessionTypes';
import {
  useSaveSessionType,
  type SaveResult,
  type SavedSessionType,
} from '@/lib/api/data/sessionTypeEdit';
import type { SavedQuestion } from '@/lib/utils/sessionTypeEdit';
import { useSaveWeeklyHours, useWeeklyHours } from '@/lib/api/data/weeklyHours';
import { deviceTimeZone } from '@/lib/utils/format';
import { SESSION_TEMPLATES } from '@/lib/utils/sessionTemplates';
import {
  applyTemplateLength,
  blankDraft,
  customFrom,
  draftFromTemplate,
  stepOf,
  toCreateBody,
  toWindows,
  validateStep,
  weeklySummary,
  type Draft,
  type FieldErrors,
  type FieldKey,
} from '@/lib/utils/sessionTypeDraft';
import { useOnline } from '@/lib/utils/useOnline';
import { useAppShell } from '../../_shell/useAppShell';
import { mentorGate } from './MentorGate';
import styles from './SessionTypesScreen.module.css';

const LIST = '/session-types';
/** The mentor's defaults when they couldn't be read: none set, so the platform's. */
const NO_DEFAULTS = {
  durationMin: null,
  noticeHours: null,
  windowDays: null,
  breakMin: null,
  requiresApproval: true,
};

/** Editing: the type as saved, and the draft it opens as (EditSessionTypeScreen loads both). */
export type EditTarget = { id: string; saved: SavedSessionType; draft: Draft };

/**
 * The session-type form (Session Types.dc.html, form view): create at
 * /session-types/new, or edit at /session-types/[id]/edit when `edit` is given
 * (the design's `editId`: every step open, "Save changes").
 */
export function SessionTypeFormScreen({
  template,
  edit,
}: {
  template: string | null;
  edit?: EditTarget;
}) {
  const router = useRouter();
  const { viewer, member, chrome, account, nav } = useAppShell();
  const online = useOnline();
  const isMentor = !!member?.isMentor;
  const { topics, isLoading: topicsLoading, error: topicsError, retry: retryTopics } = useTopics();
  const mentorId = isMentor ? member!.id : null;
  const defaults = useMentorDefaults(mentorId);
  const saveDefaults = useSaveMentorDefaults(mentorId);
  const weekly = useWeeklyHours(mentorId);
  const saveWeekly = useSaveWeeklyHours(mentorId);

  const tmpl = edit ? null : (SESSION_TEMPLATES.find((x) => x.key === template) ?? null);
  const [initial, setInitial] = useState<Draft>(() =>
    edit ? edit.draft : tmpl ? draftFromTemplate(tmpl) : blankDraft(),
  );
  const [draft, setDraft] = useState<Draft>(initial);
  // Once the mentor's defaults are known (or failed: the platform's), a template
  // whose length isn't theirs starts with its own rules (review of #60). Set
  // during render, once, so it isn't counted as an unsaved change.
  const [templateSettled, setTemplateSettled] = useState(!tmpl);
  if (!templateSettled && (defaults.data || defaults.error)) {
    setTemplateSettled(true);
    const known = defaults.data ?? NO_DEFAULTS;
    const base = applyTemplateLength(initial, tmpl!.durationMin, known);
    if (base !== initial) {
      // The baseline moves, so this isn't an unsaved change; what the mentor
      // already typed stays theirs (and still counts as unsaved). Their rules
      // change only if they haven't touched them yet (review r2 of #60).
      setInitial(base);
      if (draft.rules === initial.rules && draft.durationMin === initial.durationMin)
        setDraft({
          ...draft,
          rules: base.rules,
          durationMin: base.durationMin,
          noticeHours: base.noticeHours,
          windowDays: base.windowDays,
          breakMin: base.breakMin,
        });
    }
  }
  // "Set rules for this session" starts from the mentor's values, the first time.
  const customSeeded = useRef(false);
  const [step, setStep] = useState<Step>(1);
  // Editing: every step is open (the design's `maxStep: 4`).
  const [reached, setReached] = useState<Step>(edit ? 4 : 1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [modal, setModal] = useState<
    | { kind: 'discard' }
    | { kind: 'deleteQuestion'; index: number }
    | { kind: 'published'; created: Created }
    | { kind: 'saved' }
    | { kind: 'defaults' }
    | { kind: 'weekly' }
    | null
  >(null);
  const create = useCreateSessionType();
  const save = useSaveSessionType();
  // What didn't save last time (the type's own fields did): says so, and Save retries.
  const [partial, setPartial] = useState<SaveResult['failed']>([]);
  const [refusedQuestions, setRefusedQuestions] = useState(false);
  // The type as saved: from the loader, then from each save's own outcome, so a
  // retry diffs against what's really there without waiting for a re-read. A
  // re-read that lands afterwards is the server's word: it replaces this (review of #67).
  type Base = { draft: Draft; questions: SavedQuestion[]; windows: SavedSessionType['windows'] };
  const [base, setBase] = useState<(Base & { from: SavedSessionType }) | null>(() =>
    edit
      ? {
          draft: edit.draft,
          questions: edit.saved.questions,
          windows: edit.saved.windows,
          from: edit.saved,
        }
      : null,
  );
  if (edit && base && base.from !== edit.saved)
    setBase({
      draft: edit.draft,
      questions: edit.saved.questions,
      windows: edit.saved.windows,
      from: edit.saved,
    });
  const retry = useRetryWindows();
  const published = modal?.kind === 'published' || modal?.kind === 'saved';
  const dirty = !published && JSON.stringify(draft) !== JSON.stringify(initial);

  // Leaving with changes asks first: the browser's own prompt on reload / close.
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const update = (patch: Partial<Draft>) => {
    if (patch.rules === 'custom' && draft.rules !== 'custom' && !customSeeded.current) {
      customSeeded.current = true;
      if (defaults.data) patch = { ...customFrom(defaults.data), ...patch };
    }
    if (draft.rules === 'custom') customSeeded.current = true;
    setDraft((d) => ({ ...d, ...patch }));
    // A field the mentor changes is no longer wrong until they try again.
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as FieldKey];
      // Keys that don't match a draft field (server errors mapped by pointer, review of #49).
      const rules = ['durationMin', 'noticeHours', 'windowDays', 'breakMin', 'rules'];
      if (rules.some((k) => k in patch)) delete next.rules;
      if ('customStage' in patch || 'stages' in patch) delete next.stage;
      if ('questions' in patch)
        for (const k of Object.keys(next))
          if (k.startsWith('question-')) delete next[k as FieldKey];
      if ('days' in patch || 'hours' in patch)
        for (const k of Object.keys(next)) if (k.startsWith('slot-')) delete next[k as FieldKey];
      return next;
    });
    if (create.error) create.reset();
    if (save.error) save.reset();
  };

  const goTo = (n: Step) => {
    setStep(n);
    window.scrollTo({ top: 0 });
  };
  const showErrors = (e: FieldErrors) => {
    setErrors(e);
    const first = Object.keys(e)[0] as FieldKey | undefined;
    if (first) goTo(stepOf(first));
  };

  const onNext = () => {
    if (step < 4) {
      const e = validateStep(draft, step as 1 | 2 | 3);
      if (Object.keys(e).length) return setErrors(e);
      setErrors({});
      const n = (step + 1) as Step;
      setReached((r) => (n > r ? n : r));
      return goTo(n);
    }
    const all = { ...validateStep(draft, 1), ...validateStep(draft, 3) };
    if (Object.keys(all).length) return showErrors(all);
    const ids = Object.fromEntries(topics.flatMap((t) => (t.id ? [[t.slug, t.id]] : [])));
    if (edit) {
      save
        .save({
          id: edit.id,
          draft,
          // As saved now (after any partial save), so a retry sends only what's left.
          saved: base!.draft,
          savedQuestions: base!.questions,
          savedWindows: base!.windows,
          offeringIds: ids,
          timeZone: deviceTimeZone(),
        })
        .then(
          (r) => {
            setPartial(r.failed);
            if (!r.failed.length) return setModal({ kind: 'saved' });
            // New questions now exist: the draft carries their ids, so a retry
            // doesn't add them twice.
            const addIds = (d: Draft): Draft => ({
              ...d,
              questions: d.questions.map((q) =>
                r.newIds[q.key] ? { ...q, id: r.newIds[q.key] } : q,
              ),
            });
            const withIds = addIds(draft);
            // Onto the draft as it is now: anything typed during the save stays.
            setDraft((d) => addIds(d));
            setBase((b) => ({
              ...b!,
              draft: withIds,
              questions: r.saved.questions,
              windows: r.saved.windows,
            }));
            // Unsaved now means only the parts that didn't save.
            setInitial((i) => ({
              ...withIds,
              ...(r.failed.includes('questions') ? { questions: i.questions } : {}),
              ...(r.failed.includes('hours') ? { hours: i.hours, days: i.days } : {}),
            }));
            // A change the server refused on one question (an answered option): on it.
            const qErrors = Object.fromEntries(
              withIds.questions.flatMap((q, n) =>
                r.questionErrors[q.key] ? [[`question-${n}`, r.questionErrors[q.key]!]] : [],
              ),
            ) as FieldErrors;
            setRefusedQuestions(Object.keys(qErrors).length > 0 && r.onlyRefusals);
            if (Object.keys(qErrors).length) showErrors(qErrors);
          },
          (err: CreateError) => {
            if (Object.keys(err.fields).length) showErrors(err.fields);
          },
        );
      return;
    }
    create.create(
      {
        body: toCreateBody(draft, ids),
        windows: draft.hours === 'custom' ? toWindows(draft.days, deviceTimeZone()) : [],
      },
      {
        onSuccess: (created) => setModal({ kind: 'published', created }),
        onError: (err) => {
          if (Object.keys(err.fields).length) showErrors(err.fields);
        },
      },
    );
  };
  const onBack = () => {
    if (step > 1) return goTo((step - 1) as Step);
    if (dirty) return setModal({ kind: 'discard' });
    router.push(LIST);
  };

  const gate = mentorGate(
    viewer,
    isMentor,
    edit ? `/session-types/${edit.id}/edit` : '/session-types/new',
  );
  // PROVISIONAL copy — design request #8.
  const partialNote = !partial.length
    ? null
    : refusedQuestions && partial.length === 1
      ? 'Your changes are saved, except the intake questions marked below.'
      : `Your changes are saved, except ${partial.map((x) => (x === 'questions' ? 'the intake questions' : 'the dedicated hours')).join(' and ')}. Save again to try those.`;
  const loading = viewer.kind === 'loading' || topicsLoading;
  const auto = autoIcon(draft.topics);

  return (
    <AppShell active="Sessions" nav={nav} chrome={chrome} account={account} offline={!online}>
      {gate ??
        (topicsError && topics.length === 0 ? (
          // The form can't be filled without the catalog's topics (step 1 needs one).
          <div className={styles.gate}>
            <EmptyState
              illustration="forms"
              size={120}
              headingLevel={1}
              title="We couldn’t load this form"
              description={
                topicsError.kind === 'offline'
                  ? 'You’re offline. Try again when you reconnect.'
                  : 'Something went wrong on our side. Try again in a moment.'
              }
              actions={
                <Button size="large" onClick={retryTopics}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : loading ? (
          <div className={styles.loading} role="status" aria-label="Loading">
            <Skeleton width="50%" height="32px" />
            <Skeleton height="24px" />
            <Skeleton height="480px" radius="lg" />
          </div>
        ) : (
          <SessionTypeWizard
            title={edit ? 'Edit session type' : 'Create a session type'}
            step={step}
            reached={reached}
            draft={draft}
            update={update}
            errors={errors}
            formError={(edit ? save.error?.message : create.error?.message) ?? partialNote}
            topics={topics}
            autoIcon={auto}
            defaults={defaults.data}
            defaultsStatus={defaults.error ? 'failed' : defaults.data ? 'ready' : 'loading'}
            onRetryDefaults={defaults.retry}
            onEditDefaults={() => {
              saveDefaults.reset();
              setModal({ kind: 'defaults' });
            }}
            weekly={
              weekly.error
                ? { status: 'failed' }
                : weekly.data
                  ? {
                      status: 'ready',
                      summary: weeklySummary(weekly.data.days),
                      timeZone: weekly.data.timeZone,
                    }
                  : { status: 'loading' }
            }
            onRetryWeekly={weekly.retry}
            onEditWeekly={() => {
              saveWeekly.reset();
              setModal({ kind: 'weekly' });
            }}
            onStep={goTo}
            onBack={onBack}
            onNext={onNext}
            finishLabel={edit ? 'Save changes' : 'Publish session'}
            busy={edit ? save.isPending : create.isPending}
            onDeleteQuestion={(index) => setModal({ kind: 'deleteQuestion', index })}
          />
        ))}

      {modal?.kind === 'discard' && (
        // PROVISIONAL copy — design request #5.
        <ModalShell
          title={edit ? 'Discard your changes?' : 'Discard this session type?'}
          subtitle={
            edit
              ? 'Your changes to this session type won’t be saved.'
              : 'What you’ve entered so far won’t be saved.'
          }
          icon="delete"
          tone="danger"
          size="sm"
          onClose={() => setModal(null)}
        >
          <div className={styles.buttons}>
            <Button
              size="large"
              variant="secondary-outlined"
              fullWidth
              onClick={() => setModal(null)}
            >
              Keep editing
            </Button>
            <Button size="large" variant="destructive" fullWidth onClick={() => router.push(LIST)}>
              Discard
            </Button>
          </div>
        </ModalShell>
      )}

      {modal?.kind === 'deleteQuestion' && (
        <ModalShell
          title="Delete this question?"
          subtitle={`“${draft.questions[modal.index]?.text ?? ''}” will be removed from this session type.`}
          icon="delete"
          tone="danger"
          size="sm"
          onClose={() => setModal(null)}
        >
          <div className={styles.buttons}>
            <Button
              size="large"
              variant="secondary-outlined"
              fullWidth
              onClick={() => setModal(null)}
            >
              Keep it
            </Button>
            <Button
              size="large"
              variant="destructive"
              fullWidth
              onClick={() => {
                update({ questions: draft.questions.filter((_, i) => i !== modal.index) });
                setModal(null);
              }}
            >
              Delete
            </Button>
          </div>
        </ModalShell>
      )}

      {modal?.kind === 'defaults' && defaults.data && (
        <ModalShell
          title="Booking preferences"
          subtitle="Used by every session type set to “Use my defaults”. Changes apply right away."
          icon="tune"
          size="md"
          onClose={() => setModal(null)}
        >
          <BookingPreferencesForm
            initial={defaults.data}
            saving={saveDefaults.isPending}
            error={saveDefaults.error?.message ?? null}
            onCancel={() => setModal(null)}
            onSave={(next) =>
              void saveDefaults
                .save(next)
                .then(() => setModal(null))
                .catch(() => undefined)
            }
          />
        </ModalShell>
      )}

      {modal?.kind === 'weekly' && weekly.data && (
        <ModalShell
          title="Your weekly hours"
          subtitle="Shared by every session type set to “Use my Calendar availability”. Changes apply right away."
          icon="calendar_month"
          size="lg"
          onClose={() => setModal(null)}
        >
          <WeeklyHoursForm
            initial={weekly.data.days}
            timeZone={weekly.data.timeZone}
            otherZones={weekly.data.otherZones}
            otherSlots={weekly.data.otherSlots}
            saving={saveWeekly.isPending}
            error={saveWeekly.error?.message ?? null}
            onCancel={() => setModal(null)}
            onSave={(days) =>
              void saveWeekly
                .save({ current: weekly.data!, days })
                .then(() => setModal(null))
                .catch(() => undefined)
            }
          />
        </ModalShell>
      )}

      {modal?.kind === 'saved' && edit && (
        // Session Types.dc.html `wasEdit`: "Changes saved".
        <ModalShell
          title="Changes saved"
          subtitle={
            edit.saved.read.is_active
              ? `“${draft.name.trim()}” is live on your profile. Mentees can book it in your open hours.`
              : // PROVISIONAL copy — design request #8 (a hidden type isn't live).
                `“${draft.name.trim()}” is saved. It’s hidden, so mentees can’t book it until you switch it on.`
          }
          icon="check_circle"
          tone="success"
          size="sm"
          onClose={() => router.push(LIST)}
        >
          <div className={styles.buttons}>
            {edit.saved.read.is_active && member && (
              <ButtonLink
                href={`/mentors/${member.id}`}
                prefetch={false}
                size="large"
                variant="secondary-outlined"
                fullWidth
              >
                View on profile
              </ButtonLink>
            )}
            <Button size="large" fullWidth onClick={() => router.push(LIST)}>
              Done
            </Button>
          </div>
        </ModalShell>
      )}

      {modal?.kind === 'published' && (
        <PublishedModal
          name={draft.name.trim()}
          created={modal.created}
          profileHref={member ? `/mentors/${member.id}` : LIST}
          retrying={retry.isPending}
          onRetry={async () => {
            const still = await retry.retry({
              id: modal.created.id,
              windows: modal.created.failedWindows,
            });
            setModal({ kind: 'published', created: { ...modal.created, failedWindows: still } });
          }}
          onDone={() => router.push(LIST)}
        />
      )}
    </AppShell>
  );
}

function PublishedModal(p: {
  name: string;
  created: Created;
  profileHref: string;
  retrying: boolean;
  onRetry: () => void;
  onDone: () => void;
}) {
  const failed = p.created.failedWindows.length > 0;
  return (
    <ModalShell
      title="Session type published"
      subtitle={
        failed
          ? // PROVISIONAL copy — design request #5.
            `“${p.name}” is live on your profile, but its dedicated hours didn’t save. Until they do, mentees book it in your Calendar hours.`
          : `“${p.name}” is live on your profile. Mentees can book it in your open hours.`
      }
      icon="check_circle"
      tone="success"
      size="sm"
      onClose={p.onDone}
    >
      <div className={styles.buttons}>
        {failed ? (
          <Button
            size="large"
            variant="secondary-outlined"
            fullWidth
            busy={p.retrying}
            onClick={p.onRetry}
          >
            Retry hours
          </Button>
        ) : (
          <ButtonLink
            href={p.profileHref}
            prefetch={false}
            size="large"
            variant="secondary-outlined"
            fullWidth
          >
            View on profile
          </ButtonLink>
        )}
        <Button size="large" fullWidth onClick={p.onDone}>
          Done
        </Button>
      </div>
    </ModalShell>
  );
}
