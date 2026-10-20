'use client';

import { useId, type CSSProperties, type ReactNode, type Ref } from 'react';
import { Input } from '@/components/atoms/Input/Input';
import { Select } from '@/components/atoms/Select/Select';
import { AiField, type AssistMode } from '@/components/molecules/AiField/AiField';
import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import {
  LanguageChips,
  type LanguageOption,
} from '@/components/molecules/LanguageChips/LanguageChips';
import { PhotoPicker } from '@/components/molecules/PhotoPicker/PhotoPicker';
import type {
  LanguageSearch,
  ProfilePhotoControl,
} from '@/components/organisms/MenteeProfileForm/MenteeProfileForm';
import {
  MENTOR_PROFILE_COPY as C,
  MENTOR_PROFILE_ERRORS as E,
  type MentorProfileGap,
} from '@/lib/copy/mentorSettings';
import type { CoverIcon } from '@/lib/utils/cover';
import { ABOUT_MAX } from '@/lib/utils/profileLimits';
import type { MentorProfileValues } from '@/types/mentorSettings';
import styles from './MentorProfileForm.module.css';

/** The headline's input limit (PRD: 80 for new or edited headlines). */
const HEADLINE_INPUT_MAX = 80;

type MentorProfileFormProps = {
  values: MentorProfileValues;
  onChange: (patch: Partial<MentorProfileValues>) => void;
  /** Missing required fields, once Save was tried. */
  errors: readonly MentorProfileGap[];
  /** The name's error when it isn't simply missing (one word, characters, too long). */
  nameError?: string;
  /** The headline's gap is a new or edited one over 80 characters, not a missing one. */
  headlineTooLong?: boolean;
  /** "About you", which takes focus when the save bar goes. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** Each picker's choices: the catalog, plus that field's own saved country if the catalog dropped it. */
  countries: { origin: { id: string; label: string }[]; study: { id: string; label: string }[] };
  photo: ProfilePhotoControl;
  cover: { bg: string; ink: string; bannerUrl: string | null; artIcons: CoverIcon[] };
  /** The "Change cover" control (CoverPicker), top right of the cover. */
  coverTools?: ReactNode;
  languages: LanguageSearch;
  onAssist?: (mode: AssistMode, text: string) => Promise<string>;
  onAssistBusy?: (busy: boolean) => void;
  /** "How mentees see you": the preview column. */
  preview: ReactNode;
};

/**
 * Settings › Profile for a mentor (Mentor Settings.dc.html `isProfile`,
 * previewLayout=real): photo and cover (they save on their own), About you,
 * Background, and the preview beside them. Props only; the page saves.
 * Countries use the app's search picker (design-divergence.md: about 250 is
 * too long to scroll), as on Mentee Settings.
 */
export function MentorProfileForm({
  values,
  onChange,
  errors,
  nameError,
  headlineTooLong = false,
  headingRef,
  countries,
  photo,
  cover,
  coverTools,
  languages,
  onAssist,
  onAssistBusy,
  preview,
}: MentorProfileFormProps) {
  const id = useId();
  const has = (g: MentorProfileGap) => errors.includes(g);
  const ids = (k: string) => ({
    field: `${id}-${k}`,
    hint: `${id}-${k}-hint`,
    error: `${id}-${k}-error`,
  });
  const described = (k: string, hint: boolean, error: boolean) =>
    [hint && ids(k).hint, error && ids(k).error].filter(Boolean).join(' ') || undefined;
  const headlineBad = has('headline');
  // A stored value from elsewhere (the old platform) stays shown, not the placeholder.
  const genders = [
    ...C.genders,
    ...(values.gender && !(C.genders as readonly string[]).includes(values.gender)
      ? [values.gender]
      : []),
  ];
  const toggle = (l: LanguageOption) =>
    onChange({
      languages: values.languages.some((x) => x.id === l.id)
        ? values.languages.filter((x) => x.id !== l.id)
        : [...values.languages, l],
    });
  const art = cover.bannerUrl ? [] : cover.artIcons.slice(0, 3);

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <section
          className={styles.photoCard}
          style={{ '--cover-bg': cover.bg, '--cover-ink': cover.ink } as CSSProperties}
        >
          <div className={styles.cover}>
            {cover.bannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- the mentor's own banner, of any size
              <img src={cover.bannerUrl} alt="" className={styles.coverImg} />
            )}
            {art.length > 0 && (
              <div className={styles.art} aria-hidden>
                {art.map((icon, i) => (
                  <span key={i} className={styles.artIcon} data-i={i}>
                    {icon}
                  </span>
                ))}
              </div>
            )}
            {coverTools && <div className={styles.coverTools}>{coverTools}</div>}
          </div>
          <div className={styles.photoRow}>
            <div className={styles.photo}>
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- an uploaded photo of any size, from our API
                <img src={photo.url} alt={C.photoLabel} className={styles.img} />
              ) : (
                <span role="img" aria-label={C.photoLabel} className={styles.initials}>
                  {photo.initial}
                </span>
              )}
              <PhotoPicker
                compact
                hasPhoto={!!photo.url}
                accept={photo.accept}
                uploading={photo.uploading}
                removing={photo.removing}
                onFile={photo.onFile}
                onRemove={photo.onRemove}
                onRetryRemove={photo.onRetryRemove}
                error={photo.error}
                errorFrom={photo.errorFrom}
                removedStamp={photo.removedStamp}
                onDismissError={photo.onDismissError}
              />
            </div>
            <div className={styles.photoText}>
              <span className={styles.photoTitle}>{C.photoTitle}</span>
              <span className={styles.hint}>{C.photoHint}</span>
            </div>
          </div>
        </section>

        <section className={styles.card} aria-labelledby={`${id}-about`}>
          <h2 id={`${id}-about`} ref={headingRef} tabIndex={-1} className={styles.heading}>
            {C.aboutSection}
          </h2>
          <div className={styles.field}>
            <label htmlFor={ids('name').field} className={styles.label}>
              {C.name}
            </label>
            <Input
              id={ids('name').field}
              data-ff="name"
              autoComplete="name"
              value={values.name}
              invalid={has('name')}
              aria-describedby={described('name', false, has('name'))}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            {has('name') && <FieldError id={ids('name').error}>{nameError ?? E.name}</FieldError>}
          </div>
          <div className={styles.field}>
            <label htmlFor={ids('headline').field} className={styles.label}>
              {C.headline}
            </label>
            <Input
              id={ids('headline').field}
              data-ff="headline"
              value={values.headline}
              maxLength={HEADLINE_INPUT_MAX}
              invalid={headlineBad}
              aria-describedby={described('headline', true, headlineBad)}
              onChange={(e) => onChange({ headline: e.target.value })}
            />
            <span id={ids('headline').hint} className={styles.hint}>
              {C.headlineHint}
            </span>
            {headlineBad && (
              <FieldError id={ids('headline').error}>
                {headlineTooLong ? E.headlineTooLong : E.headline}
              </FieldError>
            )}
          </div>
          <AiField
            label={C.about}
            value={values.about}
            drafted={values.aboutDrafted}
            onChange={(about, meta) => onChange({ about, aboutDrafted: meta.drafted })}
            draftNote={C.aboutDraftNote}
            max={ABOUT_MAX}
            rows={5}
            hint={C.aboutHint}
            onAssist={onAssist}
            onBusyChange={onAssistBusy}
          />
        </section>

        <section className={styles.card} aria-labelledby={`${id}-background`}>
          <div className={styles.headingGroup}>
            <h2 id={`${id}-background`} className={styles.heading}>
              {C.background}
            </h2>
            <span className={styles.hint}>{C.backgroundSub}</span>
          </div>
          <div className={styles.grid}>
            {(
              [
                ['origin', C.origin, C.originHint, E.origin, values.originId],
                ['study', C.study, C.studyHint, E.study, values.studyId],
              ] as const
            ).map(([k, label, hint, error, value]) => (
              <div key={k} className={styles.field}>
                <label htmlFor={ids(k).field} className={styles.label}>
                  {label}
                </label>
                <CountryPicker
                  id={ids(k).field}
                  focusKey={k}
                  options={countries[k]}
                  value={value}
                  onChange={(v) => onChange(k === 'origin' ? { originId: v } : { studyId: v })}
                  placeholder={C.countryPlaceholder}
                  invalid={has(k)}
                  aria-describedby={described(k, true, has(k))}
                />
                <span id={ids(k).hint} className={styles.hint}>
                  {hint}
                </span>
                {has(k) && <FieldError id={ids(k).error}>{error}</FieldError>}
              </div>
            ))}
            <div className={styles.field}>
              <label htmlFor={ids('gender').field} className={styles.label}>
                {C.gender}
              </label>
              <Select
                id={ids('gender').field}
                options={[
                  { value: '', label: C.genderPlaceholder },
                  ...genders.map((g) => ({ value: g, label: g })),
                ]}
                value={values.gender}
                aria-describedby={ids('gender').hint}
                onChange={(e) => onChange({ gender: e.target.value })}
                className={styles.fill}
              />
              <span id={ids('gender').hint} className={styles.hint}>
                {C.genderHint}
              </span>
            </div>
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
              describedBy={described('langs', false, has('langs'))}
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
            {has('langs') && <FieldError id={ids('langs').error}>{E.langs}</FieldError>}
          </div>
        </section>
      </div>
      <aside className={styles.aside} aria-label={C.preview}>
        {preview}
      </aside>
    </div>
  );
}
