'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { HelpAreaPicker } from '@/components/organisms/HelpAreaPicker/HelpAreaPicker';
import { MatchResults } from '@/components/organisms/MatchResults/MatchResults';
import { StudyPlansForm } from '@/components/organisms/StudyPlansForm/StudyPlansForm';
import { BookingLauncher } from '@/app/_shell/BookingLauncher/BookingLauncher';
import {
  DEGREE_OPTIONS,
  FLOW_COPY,
  GUEST_COPY,
  MATCH_COPY,
  STEP_COPY,
  missingLine,
  stepLabel,
} from '@/lib/copy/onboarding';
import { deviceTimeZone } from '@/lib/utils/format';
import { basedOnLine } from '@/lib/utils/matchReason';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import { cx } from '@/lib/utils/cx';
import type { Mentor } from '@/types/mentor';
import { GuestBanner } from './GuestBanner';
import { OnboardingFrame } from './OnboardingFrame';
import { TopicsSheet } from './TopicsSheet';
import { Waiting } from './Waiting';
import { useOnboardingFlow } from './useOnboardingFlow';
import styles from './OnboardingScreen.module.css';

/**
 * Mentee Onboarding v5.dc.html, saved defaults (PRD H1): help areas → study
 * plans → the top 2 matches, with booking in place. The answers live on the
 * server, so a refresh resumes where they stopped.
 */
export function OnboardingScreen() {
  // The ref apart, so reading the rest of the flow isn't a ref read (react-hooks/refs).
  const { headingRef, ...f } = useOnboardingFlow();
  const router = useRouter();
  const phone = useMediaQuery('(max-width: 767px)');
  const online = useOnline();
  const [zone] = useState(deviceTimeZone);
  const [bookMentor, setBookMentor] = useState<Mentor | null>(null);
  const [sheetMentor, setSheetMentor] = useState<Mentor | null>(null);
  const subId = useId();
  const needId = useId();

  const form = f.form;
  const viewerError = f.viewer.kind === 'error' ? f.viewer : null;

  let body;
  if (f.doneAtLoad) {
    body = <Waiting text={FLOW_COPY.alreadySetUp} />;
  } else if (viewerError || f.loadError) {
    body = (
      <main className={styles.state}>
        <EmptyState
          illustration="forms"
          headingLevel={1}
          title={FLOW_COPY.loadErrorTitle}
          description={FLOW_COPY.loadErrorBody}
          actions={
            <Button size="large" onClick={viewerError ? viewerError.retry : f.retryLoad}>
              {MATCH_COPY.retry}
            </Button>
          }
        />
      </main>
    );
  } else if (!form) {
    body = <Waiting text={FLOW_COPY.loading} hidden />;
  } else if (form.step === 'matches') {
    const m = f.matches.data;
    // Their mentor from the profile, or from the matches if that read failed (it carries them alone).
    const guestMentor =
      f.guestMentor ??
      (f.guest
        ? (m?.matches.find((x) => x.mentor.profileHref === `/mentors/${f.guest!.handle}`)?.mentor ??
          null)
        : null);
    // Their own answers until the server's basis arrives, so the line never reads blank.
    const label = (id: string) => f.countries.find((c) => c.id === id)?.label ?? null;
    const local = {
      degree: DEGREE_OPTIONS.find((d) => d.value === form.plans.degree)?.label ?? null,
      field: form.plans.field.trim() || null,
      country: label(form.plans.destinationId),
      origin: label(form.plans.originId),
    };
    body = (
      <main className={styles.matches}>
        <MatchResults
          matches={m?.matches ?? []}
          exact={m?.exact ?? true}
          // The server's basis when it says something; the mentee's own answers otherwise.
          basis={m?.basis && basedOnLine(m.basis) ? m.basis : local}
          isLoading={f.matches.isLoading}
          error={f.matches.error}
          onRetry={f.matches.retry}
          guest={
            f.guest && (guestMentor || m?.forMentorBookable === false)
              ? {
                  firstName: guestMentor?.firstName ?? '',
                  available: !!guestMentor && (m?.forMentorBookable ?? true),
                }
              : undefined
          }
          highlight={f.topics.filter((t) => t.id && form.needIds.includes(t.id)).map((t) => t.slug)}
          compact={phone}
          timeZone={zone}
          offline={!online}
          onBook={setBookMentor}
          onMoreTopics={setSheetMentor}
          onEdit={f.edit}
          browseHref="/explore"
          headingRef={headingRef}
        />
      </main>
    );
  } else {
    const n = form.step === 'help' ? 1 : 2;
    const copy = STEP_COPY[form.step];
    const label = stepLabel(n, 2);
    // A refusal from the server names its own gaps (PRD B3).
    const gaps = f.save.error?.missing?.length ? f.save.error.missing : f.gaps;
    body = (
      <main className={cx(styles.flow, form.step === 'help' ? styles.wide : styles.narrow)}>
        <form
          className={styles.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void f.next();
          }}
        >
          <div className={styles.top}>
            <div className={styles.topRow}>
              {n === 2 && (
                <button
                  type="button"
                  className={styles.back}
                  onClick={f.back}
                  disabled={f.save.isPending}
                >
                  <Icon name="arrow_back" size={20} />
                  {FLOW_COPY.back}
                </button>
              )}
              <span className={styles.stepLabel}>{label}</span>
            </div>
            <StepBars total={2} current={n - 1} label={label} spaced />
          </div>

          {/* A guest gets the booking banner instead: the design shows one or the other. */}
          {form.resumed && !f.guestMentor && (
            <div role="status" className={styles.resume}>
              <span className={styles.resumeText}>
                <Icon name="history" size={18} className={styles.resumeIcon} />
                {FLOW_COPY.resume}
              </span>
              <button
                type="button"
                className={styles.startOver}
                onClick={f.startOver}
                disabled={f.save.isPending}
              >
                {FLOW_COPY.startOver}
              </button>
            </div>
          )}

          {form.migrated && !f.guestMentor && (
            <div role="status" className={styles.resume}>
              <span className={styles.resumeText}>
                <Icon name="history" size={18} className={styles.resumeIcon} />
                {FLOW_COPY.broughtOver}
              </span>
            </div>
          )}

          {f.guestMentor && <GuestBanner mentor={f.guestMentor} />}

          <div className={styles.titles}>
            <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
              {copy.title}
            </h1>
            <p id={subId} className={styles.sub}>
              {copy.sub}
            </p>
          </div>

          {form.step === 'help' ? (
            <HelpAreaPicker
              options={f.topics.flatMap((t) =>
                t.id ? [{ id: t.id, slug: t.slug, label: t.label }] : [],
              )}
              value={form.needIds}
              onChange={f.setNeeds}
              limit={f.helpLimit}
              label={copy.title}
              describedBy={subId}
            />
          ) : (
            <StudyPlansForm
              countries={f.countries}
              fields={f.fields}
              value={form.plans}
              onChange={f.setPlans}
            />
          )}

          <div className={styles.cta}>
            {f.save.error && !f.save.error.missing?.length && (
              <p role="alert" className={styles.saveError}>
                <Icon name="error" size={16} className={styles.saveErrorIcon} />
                {FLOW_COPY.saveError}
              </p>
            )}
            {/* Always in the DOM, so each gap is heard as it opens or closes. */}
            <p id={needId} aria-live="polite" className={styles.need}>
              {gaps.length ? missingLine(gaps) : ''}
            </p>
            <Button
              type="submit"
              size="large"
              fullWidth
              disabled={f.gaps.length > 0}
              busy={f.save.isPending}
              aria-describedby={gaps.length ? needId : undefined}
            >
              {n === 1
                ? FLOW_COPY.continue
                : f.guestMentor
                  ? GUEST_COPY.continueToBook(f.guestMentor.firstName)
                  : FLOW_COPY.seeMatches}
            </Button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <OnboardingFrame>
      {body}
      <BookingLauncher
        mentor={bookMentor}
        // Their own mentor from Book: back on the questions with the time they picked.
        {...(bookMentor && f.guest && bookMentor.profileHref === `/mentors/${f.guest.handle}`
          ? {
              initialTime: f.guest.time,
              initialSessionTypeId: f.guest.sid,
              startAfterTime: f.guest.time !== null,
            }
          : {})}
        onClose={() => setBookMentor(null)}
        // PRD US-5: a sent request lands on Home's "Waiting for {First} to confirm".
        onBooked={() => router.push('/home')}
      />
      {sheetMentor && (
        <TopicsSheet
          mentor={sheetMentor}
          offline={!online}
          onBook={(m) => {
            setSheetMentor(null);
            setBookMentor(m);
          }}
          onClose={() => setSheetMentor(null)}
        />
      )}
    </OnboardingFrame>
  );
}
