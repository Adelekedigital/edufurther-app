'use client';

import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { Notice } from '@/components/molecules/Notice/Notice';
import { FLOW_COPY, STEP_ORDER, stepLabel } from '@/lib/copy/mentorOnboarding';
import { clampFocus, personCover } from '@/lib/utils/person';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { OnboardingFrame } from '../../_components/OnboardingFrame';
import { Waiting } from '../../_components/Waiting';
import { AboutStep } from './AboutStep';
import { EducationStep } from './EducationStep';
import { HelpAreasStep } from './HelpAreasStep';
import { HoursStep } from './HoursStep';
import { useMentorOnboardingFlow } from './useMentorOnboardingFlow';
import styles from './MentorOnboardingScreen.module.css';

/**
 * Mentor Onboarding.dc.html, saved defaults (PRD F1): help areas → education
 * → about you → hours, then submit. Each Continue saves to the server, so a
 * return on any device resumes at the next step.
 */
export function MentorOnboardingScreen() {
  // The ref apart, so reading the rest of the flow isn't a ref read (react-hooks/refs).
  const { headingRef, ...f } = useMentorOnboardingFlow();
  const phone = useMediaQuery('(max-width: 767px)');
  const form = f.form;
  const viewerError = f.viewer.kind === 'error' ? f.viewer : null;
  const thisYear = new Date().getFullYear();

  let body;
  if (viewerError || f.loadError) {
    body = (
      <main className={styles.state}>
        <EmptyState
          illustration="forms"
          headingLevel={1}
          title={FLOW_COPY.loadErrorTitle}
          description={FLOW_COPY.loadErrorBody}
          actions={
            <Button size="large" onClick={viewerError ? viewerError.retry : f.retryLoad}>
              {FLOW_COPY.retry}
            </Button>
          }
        />
      </main>
    );
  } else if (!form) {
    body = <Waiting text={FLOW_COPY.loading} hidden />;
  } else {
    const a = form.answers;
    const n = STEP_ORDER.indexOf(form.step) + 1;
    const label = stepLabel(n);
    const last = form.step === 'hours';
    const showNeed = f.tried && (f.gaps.length > 0 || f.drafting);
    const has = (g: (typeof f.gaps)[number]) => f.gaps.includes(g);
    const member = f.viewer.kind === 'member' ? f.viewer : null;
    const name = member?.firstName ?? '';
    body = (
      <main className={styles.flow}>
        <form
          className={styles.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void f.next();
          }}
        >
          {form.resumed && (
            <div role="status" className={styles.resume}>
              <span className={styles.resumeText}>
                <Icon name="history" size={18} className={styles.resumeIcon} />
                {FLOW_COPY.resume}
              </span>
              <button
                type="button"
                className={styles.startOver}
                onClick={f.startOver}
                disabled={f.busy}
              >
                {FLOW_COPY.startOver}
              </button>
            </div>
          )}

          <div className={styles.top}>
            <div className={styles.topRow}>
              {n > 1 && (
                <button type="button" className={styles.back} onClick={f.back} disabled={f.busy}>
                  <Icon name="arrow_back" size={20} />
                  {FLOW_COPY.back}
                </button>
              )}
              <span className={styles.stepLabel}>{label}</span>
            </div>
            <StepBars total={STEP_ORDER.length} current={n - 1} label={label} spaced />
          </div>

          {form.step === 'help' && (
            <HelpAreasStep
              topics={f.topics}
              value={a.helpIds}
              onToggle={(id) =>
                f.set({
                  helpIds: a.helpIds.includes(id)
                    ? a.helpIds.filter((x) => x !== id)
                    : [...a.helpIds, id],
                })
              }
              error={has('help')}
              headingRef={headingRef}
            />
          )}
          {form.step === 'education' && (
            <EducationStep
              schools={a.schools}
              onChange={(schools) => f.set({ schools })}
              countries={f.countries}
              fields={f.fields}
              thisYear={thisYear}
              error={has('education') ? 'education' : has('studyCountry') ? 'studyCountry' : null}
              headingRef={headingRef}
            />
          )}
          {form.step === 'about' && (
            <AboutStep
              photo={{
                person: {
                  initials: member?.initials ?? '',
                  cover: personCover(member?.id ?? '', member?.coverKey),
                  src: a.photoUrl,
                  focus: clampFocus(member?.avatarFocus),
                  name,
                },
                upload: f.photo,
              }}
              countries={f.countries}
              originId={a.originId}
              onOrigin={(originId) => f.set({ originId })}
              linkedin={a.linkedin}
              onLinkedin={(linkedin) => f.set({ linkedin })}
              about={a.about}
              aboutDrafted={a.aboutDrafted}
              onAbout={f.setAbout}
              onAssist={f.assist}
              drafting={f.drafting}
              draftFailed={f.draftFailed}
              errors={f.gaps}
              linkedinLooksWrong={f.linkedinLooksWrong}
              headingRef={headingRef}
            />
          )}
          {form.step === 'hours' && (
            <HoursStep
              days={a.days}
              onDays={(days) => f.set({ days })}
              from={a.from}
              to={a.to}
              onFrom={f.setFrom}
              onTo={(to) => f.set({ to })}
              timeZone={a.timeZone}
              deviceZone={f.deviceZone}
              onTimeZone={f.setTimeZone}
              timeZoneFallback={a.timeZoneFallback}
              helpLabels={f.topics.filter((t) => a.helpIds.includes(t.id)).map((t) => t.label)}
              error={has('days')}
              headingRef={headingRef}
            />
          )}

          <div className={styles.cta}>
            {f.submit.error && <Notice tone="danger">{FLOW_COPY.submitError}</Notice>}
            {f.save.error && (
              <p role="alert" className={styles.saveError}>
                <Icon name="error" size={16} className={styles.saveErrorIcon} />
                {FLOW_COPY.saveError}
              </p>
            )}
            {/* Always in the DOM, so the line is heard when it appears. */}
            <p aria-live="polite" className={styles.need}>
              {showNeed ? (f.drafting ? FLOW_COPY.drafting : FLOW_COPY.fillRequired) : ''}
            </p>
            <Button type="submit" size="large" fullWidth busy={f.busy}>
              {f.submit.isPending
                ? FLOW_COPY.submitting
                : last
                  ? FLOW_COPY.submit
                  : FLOW_COPY.continue}
            </Button>
          </div>
        </form>
      </main>
    );
  }

  const status =
    f.saved && form ? (
      <span role="status" className={styles.saved}>
        <Icon name="cloud_done" size={16} />
        {phone ? FLOW_COPY.savedShort : FLOW_COPY.saved}
      </span>
    ) : undefined;

  return <OnboardingFrame status={status}>{body}</OnboardingFrame>;
}
