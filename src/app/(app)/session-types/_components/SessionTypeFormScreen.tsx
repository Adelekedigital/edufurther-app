'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SessionTypeWizard } from '@/components/organisms/SessionTypeWizard/SessionTypeWizard';
import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import { useConferencing } from '@/lib/api/data/conferencing';
import { useTopics } from '@/lib/api/data/mentors';
import {
  autoIcon,
  useMentorDefaults,
  useOwnSessionTypes,
  useRetryWindows,
  type Created,
} from '@/lib/api/data/sessionTypes';
import { useWeeklyHours } from '@/lib/api/data/weeklyHours';
import { VIDEO_LABELS } from '@/lib/copy/integrations';
import { SESSIONS_COPY, WIZARD_COPY } from '@/lib/copy/sessionTypes';
import { SESSION_TEMPLATES } from '@/lib/utils/sessionTemplates';
import { typeLength, weeklySummary, type Draft } from '@/lib/utils/sessionTypeDraft';
import { useAppShell } from '@/app/_shell/useAppShell';
import { lockedPageGate, memberGate, SESSION_TYPES_GATE } from '@/app/_shell/MentorGate';
import { PublishedModal, SavedModal } from './SessionTypeFormModals';
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
  | { kind: 'saved' };

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
  const { viewer, member, access } = useAppShell();
  const isMentor = !!member?.isMentor;
  const { topics, isLoading: topicsLoading, error: topicsError, retry: retryTopics } = useTopics();
  // A locked page (the setup lock) fetches nothing it won't show.
  const locked = access.locked.has('Sessions');
  const mentorId = isMentor && !locked ? member!.id : null;
  // All three are edited where they live (Settings, Calendar, Integrations), so step 3 reads them only.
  const defaults = useMentorDefaults(mentorId);
  const weekly = useWeeklyHours(mentorId);
  const video = useConferencing(mentorId);
  // Never chosen: the platform's, EduFurther video. Unknown (loading, failed): not named.
  const defaultVideo = video.data
    ? VIDEO_LABELS[video.data.isDefault ? 'daily' : video.data.provider]
    : null;
  const retry = useRetryWindows();

  const tmpl = edit ? null : (SESSION_TEMPLATES.find((x) => x.key === template) ?? null);
  const d = useSessionTypeDraft(edit, tmpl, defaults);

  // Opened at the session limit (by URL or a stale tab): say so rather than let
  // the mentor fill in a form the server will refuse. Decided once, as the form
  // opens: the 5th one just published mustn't swap the form for this.
  const limit = member?.sessionTypeLimit ?? null;
  const own = useOwnSessionTypes(isMentor && !locked && !edit && limit !== null);
  const fullNow =
    edit || limit === null
      ? false
      : own.data
        ? own.data.length >= limit
        : own.error
          ? false
          : undefined;
  const [fullAtOpen, setFullAtOpen] = useState<boolean>();
  if (fullAtOpen === undefined && viewer.kind !== 'loading' && fullNow !== undefined)
    setFullAtOpen(fullNow);
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
  useLeaveGuard(dirty, edit ? WIZARD_COPY.leaveEdit : WIZARD_COPY.leaveNew);

  const update = (patch: Partial<Draft>) => {
    const next = d.seedCustom(patch);
    d.setDraft((x) => ({ ...x, ...next }));
    steps.clearErrorsFor(next);
    submit.resetError();
  };
  const onNext = () => {
    if (steps.advance(d.draft, typeLength(d.draft, defaults.data?.durationMin))) submit.submit();
  };
  const onBack = () => {
    if (steps.step > 1) return steps.goTo((steps.step - 1) as typeof steps.step);
    if (dirty) return setModal({ kind: 'discard' });
    router.push(LIST);
  };
  const close = () => setModal(null);
  const toList = () => router.push(LIST);

  // The shared gates, then the setup lock (accessFor decides). A mentee never
  // gets here: the page redirects (RoleRedirect).
  const gate =
    memberGate(
      viewer,
      edit ? `/session-types/${edit.id}/edit` : '/session-types/new',
      SESSION_TYPES_GATE,
    ) ?? lockedPageGate(access, 'Sessions');
  const loading = viewer.kind === 'loading' || topicsLoading || fullAtOpen === undefined;

  return (
    <>
      {gate ??
        (fullAtOpen ? (
          <div className={styles.gate}>
            <EmptyState
              illustration="task-templates"
              size={120}
              headingLevel={1}
              title={SESSIONS_COPY.atLimit(limit)}
              description={SESSIONS_COPY.atLimitBody}
              actions={
                <ButtonLink href={LIST} prefetch={false} size="large">
                  {SESSIONS_COPY.backToList}
                </ButtonLink>
              }
            />
          </div>
        ) : topicsError && topics.length === 0 ? (
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
            title={edit ? SESSIONS_COPY.editTitle : SESSIONS_COPY.createTitle}
            step={steps.step}
            reached={steps.reached}
            draft={d.draft}
            update={update}
            errors={steps.errors}
            attempt={steps.attempt}
            formError={submit.error}
            topics={topics}
            autoIcon={autoIcon(d.draft.topics)}
            defaults={defaults.data}
            defaultsStatus={defaults.error ? 'failed' : defaults.data ? 'ready' : 'loading'}
            onRetryDefaults={defaults.retry}
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
            defaultVideo={defaultVideo}
            topicsPreselected={
              !!edit?.saved.read.is_starter &&
              [...d.draft.topics].sort().join() === [...d.initial.topics].sort().join()
            }
            videoFailed={!!video.error && !video.data}
            onRetryVideo={video.retry}
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
        <ConfirmDialog
          title={edit ? 'Discard your changes?' : WIZARD_COPY.discardNew}
          subtitle={
            edit ? WIZARD_COPY.discardEditBody : 'What you’ve entered so far won’t be saved.'
          }
          icon="delete"
          keepLabel="Keep editing"
          confirmLabel="Discard"
          onKeep={close}
          onConfirm={toList}
        />
      )}
      {modal?.kind === 'deleteQuestion' && (
        <ConfirmDialog
          title="Delete this question?"
          subtitle={WIZARD_COPY.questionRemoved(d.draft.questions[modal.index]?.text ?? '')}
          icon="delete"
          keepLabel="Keep it"
          confirmLabel="Delete"
          onKeep={close}
          onConfirm={() => {
            update({ questions: d.draft.questions.filter((_, i) => i !== modal.index) });
            close();
          }}
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
    </>
  );
}
