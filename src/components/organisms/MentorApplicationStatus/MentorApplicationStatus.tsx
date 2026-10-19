/* eslint-disable @next/next/no-img-element -- static decorative SVGs; next/image adds nothing for vector art */
'use client';

import { useEffect, useRef, type MouseEvent, type RefObject } from 'react';
import { ButtonAnchor, ButtonLink, Button } from '@/components/atoms/Button/Button';
import { Confetti } from '@/components/atoms/Confetti/Confetti';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import {
  ApprovedSummary,
  type SummaryRow,
} from '@/components/molecules/ApprovedSummary/ApprovedSummary';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { NextSteps } from '@/components/molecules/NextSteps/NextSteps';
import { ReviewerNote } from '@/components/molecules/ReviewerNote/ReviewerNote';
import {
  APPROVED_COPY,
  IN_REVIEW_COPY,
  NEXT_STEPS,
  NOT_APPROVED_COPY,
  STATUS_PAGE_COPY,
} from '@/lib/copy/mentorApplication';
import styles from './MentorApplicationStatus.module.css';

export type MentorApplicationStatusProps =
  | { state: 'loading' }
  | { state: 'error'; onRetry: () => void; retrying?: boolean }
  | {
      state: 'pending';
      email: string;
      editHref: string;
      /** Straight from Submit: the heading says it was sent, once. */
      justSent?: boolean;
      firstName?: string;
    }
  | {
      state: 'approved';
      firstName: string;
      /** Hours, Intro chat and Explore rows; a row with nothing real to say is left out. */
      summary: readonly SummaryRow[];
      integrationsHref: string;
      dashboardHref: string;
      /** Once per account: false when the page is shown again in the same visit. */
      celebrate: boolean;
    }
  | {
      state: 'declined';
      firstName: string;
      email: string;
      note: string | null;
      /** Already formatted ("Oct 14, 2026"). */
      reviewDate: string | null;
      mailto: string;
      menteeHref: string;
      onContinueAsMentee: () => void;
      menteePending: boolean;
      menteeFailed: boolean;
    };

/**
 * /mentor-application (Approved.dc.html, saved defaults): in review, approved,
 * not approved, plus loading and error. Props only; the page fetches.
 */
export function MentorApplicationStatus(props: MentorApplicationStatusProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  // A new page for the reader: focus its heading once the state is known.
  useEffect(() => {
    if (props.state !== 'loading') heading.current?.focus();
  }, [props.state]);

  switch (props.state) {
    case 'loading':
      return (
        <div className={styles.loading}>
          <LiveRegion message={{ text: STATUS_PAGE_COPY.loading, id: 0 }} />
          <Skeleton width="120px" height="120px" radius="full" />
          <Skeleton width="min(100%, 360px)" height="32px" radius="md" />
          <Skeleton width="min(100%, 480px)" height="20px" />
          <Skeleton width="100%" height="200px" radius="lg" />
        </div>
      );
    case 'error':
      return (
        <div className={styles.errorState}>
          <EmptyState
            illustration="forms"
            headingLevel={1}
            title={STATUS_PAGE_COPY.loadErrorTitle}
            description={STATUS_PAGE_COPY.loadErrorBody}
            actions={
              <Button size="large" onClick={props.onRetry} busy={props.retrying}>
                {STATUS_PAGE_COPY.retry}
              </Button>
            }
          />
        </div>
      );
    case 'pending':
      return (
        <div className={styles.inReview} data-screen-label="In review">
          <img src="/illustrations/forms.svg" alt="" className={styles.art} />
          <div className={styles.headingGroup}>
            <h1 ref={heading} tabIndex={-1} className={styles.title}>
              {props.justSent
                ? IN_REVIEW_COPY.sentTitle(props.firstName ?? '')
                : IN_REVIEW_COPY.title}
            </h1>
            <p className={styles.lead}>
              {props.justSent
                ? IN_REVIEW_COPY.sentBody(props.email)
                : IN_REVIEW_COPY.body(props.email)}
            </p>
          </div>
          <NextSteps steps={NEXT_STEPS} />
          <ButtonLink href={props.editHref} variant="secondary-outlined" size="large">
            {IN_REVIEW_COPY.edit}
          </ButtonLink>
        </div>
      );
    case 'approved':
      return (
        <div className={styles.approved} data-screen-label="Approved">
          {props.celebrate && <Confetti />}
          <div className={styles.hero}>
            <img src="/illustrations/team.svg" alt="" className={styles.art} />
            <span className={styles.badge}>
              <Icon name="verified" size={16} />
              {APPROVED_COPY.badge}
            </span>
            <h1 ref={heading} tabIndex={-1} className={`${styles.title} ${styles.balance}`}>
              {APPROVED_COPY.title(props.firstName)}
            </h1>
            <p className={`${styles.lead} ${styles.heroLead}`}>{APPROVED_COPY.body}</p>
          </div>
          <ApprovedSummary
            rows={props.summary}
            calendar={{
              title: APPROVED_COPY.calendarTitle,
              optional: APPROVED_COPY.calendarOptional,
              body: APPROVED_COPY.calendarBody,
              label: APPROVED_COPY.calendarLink,
              href: props.integrationsHref,
            }}
          />
          <div className={styles.actions}>
            <ButtonLink href={props.dashboardHref} size="large">
              {APPROVED_COPY.go}
            </ButtonLink>
          </div>
        </div>
      );
    case 'declined':
      return <NotApproved {...props} headingRef={heading} />;
  }
}

function NotApproved({
  headingRef,
  ...props
}: Extract<MentorApplicationStatusProps, { state: 'declined' }> & {
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const onMentee = (e: MouseEvent<HTMLAnchorElement>) => {
    // The role is saved first; the page moves on once it is.
    e.preventDefault();
    if (!props.menteePending) props.onContinueAsMentee();
  };
  return (
    <div className={styles.notApproved} data-screen-label="Not approved">
      <div className={styles.headingGroup}>
        <h1 ref={headingRef} tabIndex={-1} className={`${styles.title} ${styles.balance}`}>
          {NOT_APPROVED_COPY.title}
        </h1>
        <p className={styles.lead}>{NOT_APPROVED_COPY.body(props.firstName)}</p>
      </div>
      {props.note && (
        <ReviewerNote from={NOT_APPROVED_COPY.noteFrom} date={props.reviewDate} note={props.note} />
      )}
      <div className={styles.againCard}>
        <div className={styles.againRow}>
          <span className={styles.againTile}>
            <Icon name="mail" size={20} />
          </span>
          <span className={styles.againText}>
            <span className={styles.againTitle}>{NOT_APPROVED_COPY.againTitle}</span>
            <span className={styles.againBody}>{NOT_APPROVED_COPY.againBody}</span>
          </span>
        </div>
        <ButtonAnchor href={props.mailto} size="large" fullWidth>
          {NOT_APPROVED_COPY.contact}
        </ButtonAnchor>
        <span className={styles.sentTo}>{NOT_APPROVED_COPY.sentTo(props.email)}</span>
      </div>
      <p className={styles.menteeLine}>
        {NOT_APPROVED_COPY.menteeLead}{' '}
        <a href={props.menteeHref} onClick={onMentee} aria-busy={props.menteePending || undefined}>
          {NOT_APPROVED_COPY.mentee}
        </a>
      </p>
      {props.menteeFailed && (
        <p role="alert" className={styles.menteeError}>
          {NOT_APPROVED_COPY.menteeError}
        </p>
      )}
    </div>
  );
}
