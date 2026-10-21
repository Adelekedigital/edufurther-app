'use client';

import { useId, type Ref } from 'react';
import { ExternalLink } from '@/components/atoms/ExternalLink/ExternalLink';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input } from '@/components/atoms/Input/Input';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { AiField, type AssistMode } from '@/components/molecules/AiField/AiField';
import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { Notice } from '@/components/molecules/Notice/Notice';
import {
  ProfilePhoto,
  type PhotoPerson,
  type PhotoUpload,
} from '@/components/molecules/ProfilePhoto/ProfilePhoto';
import type { CatalogOption } from '@/lib/api/data/catalog';
import { ABOUT_COPY as C, GAP_COPY } from '@/lib/copy/mentorOnboarding';
import type { MentorGap } from '@/types/mentorOnboarding';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { StepTitles } from './StepTitles';
import styles from './AboutStep.module.css';
import step from './steps.module.css';

/** About (`about_me`) holds 1,500 characters (owner, 2026-10-17; design-divergence.md). */
const ABOUT_MAX = 1500;

export const ABOUT_IDS = {
  photo: 'mo-photo',
  origin: 'mo-origin',
  linkedin: 'mo-linkedin',
} as const;

/** Their photo and the upload: no remove here (a photo is required to apply). */
export type AboutPhoto = { person: PhotoPerson; upload: PhotoUpload };

type AboutStepProps = {
  photo: AboutPhoto;
  countries: CatalogOption[];
  originId: string;
  onOrigin: (id: string) => void;
  linkedin: string;
  onLinkedin: (url: string) => void;
  about: string;
  aboutDrafted: boolean;
  onAbout: (text: string, drafted: boolean) => void;
  onAssist: (mode: AssistMode, text: string) => Promise<string>;
  /** The first draft is on its way (on arrival with an empty About). */
  drafting: boolean;
  draftFailed: boolean;
  /** Gaps found by the last Continue; empty until then. */
  errors: MentorGap[];
  /** A link typed but not a profile link, shown as they type (design `liErr`). */
  linkedinLooksWrong: boolean;
  headingRef: Ref<HTMLHeadingElement>;
};

/** Step 3 (design `showAbout` + `showStory`, lite): photo, origin, LinkedIn, then About. */
export function AboutStep({
  photo,
  countries,
  originId,
  onOrigin,
  linkedin,
  onLinkedin,
  about,
  aboutDrafted,
  onAbout,
  onAssist,
  drafting,
  draftFailed,
  errors,
  linkedinLooksWrong,
  headingRef,
}: AboutStepProps) {
  const id = useId();
  const has = (g: MentorGap) => errors.includes(g);
  const linkedinWrong = !has('linkedin') && (has('linkedinFormat') || linkedinLooksWrong);
  return (
    <>
      <section className={step.section}>
        <StepTitles title={C.title} sub={C.sub} headingRef={headingRef} />
        <div className={styles.photoRow}>
          <ProfilePhoto
            size={88}
            inputId={ABOUT_IDS.photo}
            person={photo.person}
            upload={photo.upload}
          />
          <span className={styles.photoText}>
            <span className={styles.photoTitle}>{C.photo}</span>
            <span className={step.hint}>{C.photoHint}</span>
            {has('photo') && <FieldError>{GAP_COPY.photo}</FieldError>}
          </span>
        </div>

        <div className={step.field}>
          <label htmlFor={ABOUT_IDS.origin} className={step.label}>
            {C.origin}
          </label>
          <CountryPicker
            id={ABOUT_IDS.origin}
            aria-describedby={`${id}-origin`}
            invalid={has('origin')}
            size="xl"
            options={countries}
            value={originId}
            onChange={onOrigin}
            placeholder={C.originPlaceholder}
          />
          <p id={`${id}-origin`} className={step.hint}>
            {C.originHint}
          </p>
          {has('origin') && <FieldError>{GAP_COPY.origin}</FieldError>}
        </div>

        <div className={step.field}>
          <label htmlFor={ABOUT_IDS.linkedin} className={step.label}>
            {C.linkedin}
          </label>
          <Input
            id={ABOUT_IDS.linkedin}
            type="url"
            inputMode="url"
            autoComplete="url"
            fieldSize="xl"
            placeholder={C.linkedinPlaceholder}
            aria-describedby={`${id}-linkedin`}
            invalid={has('linkedin') || linkedinWrong}
            value={linkedin}
            onChange={(e) => onLinkedin(e.target.value)}
          />
          <span id={`${id}-linkedin`} className={styles.linkedinHint}>
            <span>{C.linkedinHint}</span>
            <ExternalLink href={C.linkedinUrl} label={C.linkedinLink} className={styles.link}>
              {C.linkedinLink}
              <Icon name="open_in_new" size={14} />
            </ExternalLink>
          </span>
          {has('linkedin') && <FieldError>{GAP_COPY.linkedin}</FieldError>}
          {linkedinWrong && <FieldError>{GAP_COPY.linkedinFormat}</FieldError>}
        </div>
      </section>

      <section className={step.section}>
        {/* Always mounted, so the draft starting and failing are both heard. */}
        <LiveRegion
          message={
            drafting
              ? { text: C.drafting, id: 1 }
              : draftFailed
                ? { text: C.draftFailed, id: 2 }
                : null
          }
        />
        {drafting ? (
          <div className={styles.drafting}>
            <Spinner size={20} />
            {C.drafting}
          </div>
        ) : (
          <>
            <AiField
              label={C.aboutLabel}
              value={about}
              drafted={aboutDrafted}
              onChange={(text, meta) => onAbout(text, meta.drafted)}
              max={ABOUT_MAX}
              rows={6}
              hint={C.aboutHint}
              placeholder={C.aboutPlaceholder}
              onAssist={onAssist}
            />
            {draftFailed && (
              <Notice tone="info" live={false}>
                {C.draftFailed}
              </Notice>
            )}
          </>
        )}
      </section>
    </>
  );
}
