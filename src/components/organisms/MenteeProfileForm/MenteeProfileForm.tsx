'use client';

import { useId, type Ref } from 'react';
import { Input } from '@/components/atoms/Input/Input';
import { AiField, type AssistMode } from '@/components/molecules/AiField/AiField';
import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import {
  LanguageChips,
  type LanguageOption,
} from '@/components/molecules/LanguageChips/LanguageChips';
import {
  ProfilePhoto,
  type PhotoPerson,
  type PhotoUpload,
} from '@/components/molecules/ProfilePhoto/ProfilePhoto';
import { PROFILE_COPY as C, PROFILE_ERRORS, type ProfileGap } from '@/lib/copy/settings';
import type { MenteeProfileValues } from '@/types/settings';
import styles from './MenteeProfileForm.module.css';

/** The mentee's bio shares `about_me` with the mentor About: 1,500 (owner, 2026-10-17 and 2026-10-19). */
export const BIO_MAX = 1500;

export type { MenteeProfileValues };

/** The photo card: whose photo (its name is the card's own label), the upload, and the page's remove confirm. */
export type ProfilePhotoControl = {
  person: Omit<PhotoPerson, 'name'>;
  upload: PhotoUpload;
  onRemove: () => void;
};

export type LanguageSearch = {
  common: LanguageOption[];
  query: string;
  onQueryChange: (q: string) => void;
  results: LanguageOption[];
  status: 'loading' | 'error' | 'ready';
  /** The common languages didn't load: Try again (`at`: when, so a repeat is heard). */
  commonFailed?: { retry: () => void; at: number };
};

type MenteeProfileFormProps = {
  values: MenteeProfileValues;
  onChange: (patch: Partial<MenteeProfileValues>) => void;
  /** Missing required fields, once Save was tried. */
  errors: readonly ProfileGap[];
  /** The name's error when it isn't simply missing (one word, characters, too long). */
  nameError?: string;
  /** "About you", which takes focus when the save bar goes. */
  headingRef?: Ref<HTMLHeadingElement>;
  countries: { id: string; label: string }[];
  photo: ProfilePhotoControl;
  languages: LanguageSearch;
  onAssist?: (mode: AssistMode, text: string) => Promise<string>;
  onAssistBusy?: (busy: boolean) => void;
};

/**
 * Settings › Profile for a mentee (Mentee Settings.dc.html `isMProfile`): the
 * photo card, which saves on its own, then "About you": name, the country they
 * live in, languages and a short bio. Props only; the page saves.
 */
export function MenteeProfileForm({
  values,
  onChange,
  errors,
  nameError,
  headingRef,
  countries,
  photo,
  languages,
  onAssist,
  onAssistBusy,
}: MenteeProfileFormProps) {
  const id = useId();
  const has = (g: ProfileGap) => errors.includes(g);
  const ids = {
    name: `${id}-name`,
    country: `${id}-country`,
    countryHint: `${id}-country-hint`,
    countryError: `${id}-country-error`,
    nameError: `${id}-name-error`,
    langsHint: `${id}-langs-hint`,
  };
  const toggle = (l: LanguageOption) =>
    onChange({
      languages: values.languages.some((x) => x.id === l.id)
        ? values.languages.filter((x) => x.id !== l.id)
        : [...values.languages, l],
    });

  return (
    <div className={styles.form}>
      <section className={styles.photoCard}>
        <ProfilePhoto
          size={72}
          person={{ ...photo.person, name: C.photoLabel }}
          upload={photo.upload}
          onRemove={photo.onRemove}
        />
        <div className={styles.photoText}>
          <span className={styles.photoTitle}>{C.photo}</span>
          <span className={styles.photoHint}>{C.photoHint}</span>
        </div>
      </section>

      <section className={styles.card} aria-labelledby={`${id}-about`}>
        <h2 id={`${id}-about`} ref={headingRef} tabIndex={-1} className={styles.heading}>
          {C.section}
        </h2>

        <div className={styles.field}>
          <label htmlFor={ids.name} className={styles.label}>
            {C.name}
          </label>
          <Input
            id={ids.name}
            data-ff="name"
            autoComplete="name"
            value={values.name}
            invalid={has('name')}
            aria-describedby={has('name') ? ids.nameError : undefined}
            onChange={(e) => onChange({ name: e.target.value })}
          />
          {has('name') && (
            <FieldError id={ids.nameError}>{nameError ?? PROFILE_ERRORS.name}</FieldError>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor={ids.country} className={styles.label}>
            {C.country}
          </label>
          <CountryPicker
            id={ids.country}
            focusKey="country"
            options={countries}
            value={values.countryId}
            onChange={(countryId) => onChange({ countryId })}
            placeholder={C.countryPlaceholder}
            invalid={has('country')}
            aria-describedby={
              has('country') ? `${ids.countryHint} ${ids.countryError}` : ids.countryHint
            }
          />
          <span id={ids.countryHint} className={styles.hint}>
            {C.countryHint}
          </span>
          {has('country') && (
            <FieldError id={ids.countryError}>{PROFILE_ERRORS.country}</FieldError>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{C.languages}</span>
          <LanguageChips
            label={C.languages}
            focusKey="langs"
            common={languages.common}
            selected={values.languages}
            onToggle={toggle}
            query={languages.query}
            onQueryChange={languages.onQueryChange}
            results={languages.results}
            status={languages.status}
            describedBy={ids.langsHint}
            commonFailed={
              languages.commonFailed && {
                text: C.commonLanguagesFailed,
                retry: C.retry,
                onRetry: languages.commonFailed.retry,
                at: languages.commonFailed.at,
              }
            }
            copy={{
              add: C.addLanguage,
              addButton: C.add,
              cancel: C.cancel,
              placeholder: C.addLanguagePlaceholder,
              searching: C.searchingLanguages,
              searchFailed: C.languageSearchFailed,
              noMatch: C.noLanguageMatch,
            }}
          />
          <span id={ids.langsHint} className={styles.hint}>
            {C.languagesHint}
          </span>
        </div>

        <AiField
          label={C.bio}
          value={values.bio}
          drafted={values.bioDrafted}
          onChange={(bio, meta) => onChange({ bio, bioDrafted: meta.drafted })}
          draftNote={C.bioDraftNote}
          max={BIO_MAX}
          rows={3}
          placeholder={C.bioPlaceholder}
          hint={C.bioHint}
          onAssist={onAssist}
          onBusyChange={onAssistBusy}
        />
      </section>
    </div>
  );
}
