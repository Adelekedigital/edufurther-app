'use client';

import { useId, type ReactNode, type Ref } from 'react';
import { FrozenGroup } from '@/components/atoms/FrozenGroup/FrozenGroup';
import { Input } from '@/components/atoms/Input/Input';
import { Select } from '@/components/atoms/Select/Select';
import { AiField, type AssistMode } from '@/components/molecules/AiField/AiField';
import { CoverBanner } from '@/components/molecules/CoverBanner/CoverBanner';
import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import {
  LanguageChips,
  type LanguageOption,
} from '@/components/molecules/LanguageChips/LanguageChips';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { ProfilePhoto } from '@/components/molecules/ProfilePhoto/ProfilePhoto';
import type {
  LanguageSearch,
  ProfilePhotoControl,
} from '@/components/organisms/MenteeProfileForm/MenteeProfileForm';
import { CoverHeader } from '@/components/organisms/CoverHeader/CoverHeader';
import {
  MENTOR_PROFILE_COPY as C,
  MENTOR_PROFILE_ERRORS as E,
  type MentorProfileGap,
} from '@/lib/copy/mentorSettings';
import type { CoverIcon } from '@/lib/utils/cover';
import { cx } from '@/lib/utils/cx';
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
  /**
   * The application is in review: what the reviewer judges is read-only
   * (photo, cover, headline, About, countries, languages). Name and gender
   * stay editable (owner, 2026-10-20).
   */
  frozen?: boolean;
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
  frozen = false,
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

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <CoverHeader
          as="section"
          // Frozen, its only controls (photo and cover) are gone: dimmed as drawn.
          className={cx(styles.photoCard, frozen && styles.frozen)}
          cover={
            <CoverBanner
              className={styles.cover}
              height={120}
              scale="md"
              tones={{ bg: cover.bg, ink: cover.ink }}
              bannerUrl={cover.bannerUrl}
              art="icons"
              icons={cover.artIcons}
              tools={frozen ? undefined : coverTools}
            />
          }
          photo={
            frozen ? (
              // Frozen while the application is in review: the photo, no editor.
              <Avatar
                size={72}
                ring="white"
                initials={photo.person.initials}
                tone={photo.person.cover}
                src={photo.person.src}
                focus={photo.person.focus}
                alt={C.photoLabel}
              />
            ) : (
              <ProfilePhoto
                size={72}
                ring="white"
                person={{ ...photo.person, name: C.photoLabel }}
                upload={photo.upload}
                onRemove={photo.onRemove}
              />
            )
          }
          // The photo rises 32px into the cover; the title and hint sit beside
          // it, below the cover, and wrap downwards on phones.
          overlap={32}
          contentBasis={200}
          bodyClassName={styles.photoRow}
        >
          <div className={styles.photoText}>
            <span className={styles.photoTitle}>{C.photoTitle}</span>
            <span className={styles.hint}>{C.photoHint}</span>
          </div>
        </CoverHeader>

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
          <FrozenGroup frozen={frozen} className={styles.field}>
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
          </FrozenGroup>
          <FrozenGroup frozen={frozen}>
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
          </FrozenGroup>
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
              <FrozenGroup key={k} frozen={frozen} className={styles.field}>
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
              </FrozenGroup>
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
          <FrozenGroup frozen={frozen} className={styles.field}>
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
          </FrozenGroup>
        </section>
      </div>
      <aside className={styles.aside} aria-label={C.preview}>
        {preview}
      </aside>
    </div>
  );
}
