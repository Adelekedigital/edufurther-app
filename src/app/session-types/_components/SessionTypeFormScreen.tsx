'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SessionTypeWizard } from '@/components/organisms/SessionTypeWizard/SessionTypeWizard';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { useTopics } from '@/lib/api/data/mentors';
import {
  autoIcon,
  useMentorDefaults,
  useRetryWindows,
  useSaveMentorDefaults,
  type Created,
} from '@/lib/api/data/sessionTypes';
import { useSaveWeeklyHours, useWeeklyHours } from '@/lib/api/data/weeklyHours';
import { SESSION_TEMPLATES } from '@/lib/utils/sessionTemplates';
import { weeklySummary, type Draft } from '@/lib/utils/sessionTypeDraft';
import { useOnline } from '@/lib/utils/useOnline';
import { useAppShell } from '../../_shell/useAppShell';
import { mentorGate } from '../../_shell/MentorGate';
import {
  DangerConfirm,
  DefaultsModal,
  PublishedModal,
  SavedModal,
  WeeklyModal,
} from './SessionTypeFormModals';
import styles from './SessionTypesScreen.module.css';
import { useLeaveGuard, useSessionTypeDraft, type EditTarget } from './useSessionTypeDraft';
import { useSessionTypeSubmit } from './useSessionTypeSubmit';
import { useWizardSteps } from './useWizardSteps';

export type { EditTarget } from './useSessionTypeDraft';

const LIST = '/session-types';
type Modal =
  | { kind: 'discard' }
  | { kind: 'deleteQuestion'; index: number }
  | { kind: 'published'; created: Created }
  | { kind: 'saved' }
  | { kind: 'defaults' }
  | { kind: 'weekly' };

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
  const retry = useRetryWindows();

  const tmpl = edit ? null : (SESSION_TEMPLATES.find((x) => x.key === template) ?? null);
  const d = useSessionTypeDraft(edit, tmpl, defaults);
  const steps = useWizardSteps(!!edit);
  const [modal, setModal] = useState<Modal | null>(null);
  const submit = useSessionTypeSubmit({
    edit,
    draft: d.draft,
    setDraft: d.setDraft,
    setInitial: d.setInitial,
    base: d.base,
    setBase: d.setBase,
    topics,
    showErrors: steps.showErrors,
    onPublished: (created) => setModal({ kind: 'published', created }),
    onSaved: () => setModal({ kind: 'saved' }),
  });
  const published = modal?.kind === 'published' || modal?.kind === 'saved';
  const dirty = !published && JSON.stringify(d.draft) !== JSON.stringify(d.initial);
  useLeaveGuard(dirty, edit ? 'this session type' : 'this new session type');

  const update = (patch: Partial<Draft>) => {
    const next = d.seedCustom(patch);
    d.setDraft((x) => ({ ...x, ...next }));
    steps.clearErrorsFor(next);
    submit.resetError();
  };
  const onNext = () => {
    if (steps.advance(d.draft)) submit.submit();
  };
  const onBack = () => {
    if (steps.step > 1) return steps.goTo((steps.step - 1) as typeof steps.step);
    if (dirty) return setModal({ kind: 'discard' });
    router.push(LIST);
  };
  const close = () => setModal(null);
  const toList = () => router.push(LIST);

  const gate = mentorGate(
    viewer,
    isMentor,
    edit ? `/session-types/${edit.id}/edit` : '/session-types/new',
  );
  const loading = viewer.kind === 'loading' || topicsLoading;

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
            step={steps.step}
            reached={steps.reached}
            draft={d.draft}
            update={update}
            errors={steps.errors}
            formError={submit.error}
            topics={topics}
            autoIcon={autoIcon(d.draft.topics)}
            defaults={defaults.data}
            defaultsStatus={defaults.error ? 'failed' : defaults.data ? 'ready' : 'loading'}
            onRetryDefaults={defaults.retry}
            onEditDefaults={() => {
              saveDefaults.reset();
              // Read the cap again: it can have changed since the form opened.
              defaults.retry();
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
            onStep={steps.goTo}
            onBack={onBack}
            onNext={onNext}
            finishLabel={edit ? 'Save changes' : 'Publish session'}
            busy={submit.busy}
            onDeleteQuestion={(index) => setModal({ kind: 'deleteQuestion', index })}
          />
        ))}

      {modal?.kind === 'discard' && (
        // Copy confirmed by design (reply 2026-09-29, #5).
        <DangerConfirm
          title={edit ? 'Discard your changes?' : 'Discard this session type?'}
          subtitle={
            edit
              ? 'Your changes to this session type won’t be saved.'
              : 'What you’ve entered so far won’t be saved.'
          }
          keep="Keep editing"
          confirm="Discard"
          onKeep={close}
          onConfirm={toList}
        />
      )}
      {modal?.kind === 'deleteQuestion' && (
        <DangerConfirm
          title="Delete this question?"
          subtitle={`“${d.draft.questions[modal.index]?.text ?? ''}” will be removed from this session type.`}
          keep="Keep it"
          confirm="Delete"
          onKeep={close}
          onConfirm={() => {
            update({ questions: d.draft.questions.filter((_, i) => i !== modal.index) });
            close();
          }}
        />
      )}
      {modal?.kind === 'defaults' && defaults.data && !defaults.refreshing && (
        <DefaultsModal
          defaults={defaults.data}
          saving={saveDefaults.isPending}
          error={saveDefaults.error?.message ?? null}
          onClose={close}
          onSave={(next) =>
            void saveDefaults
              .save(next)
              .then(close)
              .catch(() => undefined)
          }
        />
      )}
      {modal?.kind === 'weekly' && weekly.data && (
        <WeeklyModal
          weekly={weekly.data}
          saving={saveWeekly.isPending}
          error={saveWeekly.error?.message ?? null}
          onClose={close}
          onSave={(days) =>
            void saveWeekly
              .save({ current: weekly.data!, days })
              .then(close)
              .catch(() => undefined)
          }
        />
      )}
      {modal?.kind === 'saved' && edit && (
        <SavedModal
          name={d.draft.name.trim()}
          live={edit.saved.read.is_active}
          profileHref={member ? `/mentors/${member.id}` : null}
          onDone={toList}
        />
      )}
      {modal?.kind === 'published' && (
        <PublishedModal
          name={d.draft.name.trim()}
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
          onDone={toList}
        />
      )}
    </AppShell>
  );
}
