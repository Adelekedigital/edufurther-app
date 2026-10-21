'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { useRequiredFields } from '@/lib/utils/useRequiredFields';
import { Button } from '@/components/atoms/Button/Button';
import { FrozenGroup } from '@/components/atoms/FrozenGroup/FrozenGroup';
import { Input } from '@/components/atoms/Input/Input';
import { FormField } from '@/components/molecules/FormField/FormField';
import { headlineProblem } from '@/lib/api/data/mentorSettings';
import { INTRO_ERRORS } from '@/lib/copy/profile';
import { SAVE_COPY } from '@/lib/copy/settings';
import { HEADLINE_MAX, NAME_MAX } from '@/lib/utils/profileLimits';
import styles from './IntroEditForm.module.css';

export type IntroValues = { firstName: string; lastName: string; headline: string };
export type IntroErrors = Partial<Record<keyof IntroValues | 'general', string>>;

type IntroEditFormProps = {
  initial: IntroValues;
  onSave: (values: IntroValues) => void;
  onCancel: () => void;
  saving: boolean;
  errors?: IntroErrors;
  /**
   * The application is in review: the headline holds still (the review
   * freeze), and only the names change (owner, 21 Oct).
   */
  headlineFrozen?: boolean;
};

type Gap = 'firstName' | 'lastName' | 'headline';

/**
 * The owner's name and headline, edited in place of the header's intro
 * (Mentor Profile.dc.html `editingIntro`). The shared form rule (#325): Save
 * is never disabled; saving with gaps says "Fill in the required fields to
 * continue.", marks each missing field and focuses the first. The headline
 * takes Settings' rule: 80 characters once it's changed, an unchanged older
 * one still saves. Escape cancels. The first field has focus on open.
 */
export function IntroEditForm({
  initial,
  onSave,
  onCancel,
  saving,
  errors = {},
  headlineFrozen = false,
}: IntroEditFormProps) {
  const [v, setV] = useState(initial);
  // Frozen while open: the field shows what will save (adjusted during render).
  const [wasFrozen, setWasFrozen] = useState(headlineFrozen);
  if (headlineFrozen !== wasFrozen) {
    setWasFrozen(headlineFrozen);
    if (headlineFrozen) setV((x) => ({ ...x, headline: initial.headline }));
  }
  const headline = headlineFrozen ? null : headlineProblem(initial.headline, v.headline);
  const gaps: Gap[] = [
    ...(v.firstName.trim() ? [] : ['firstName' as const]),
    ...(v.lastName.trim() ? [] : ['lastName' as const]),
    ...(headline ? ['headline' as const] : []),
  ];
  // Leaving with edits asks first (any in-app link, Logout, the browser's prompt).
  useLeaveGuard(JSON.stringify(v) !== JSON.stringify(initial), 'your intro');
  const first = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const required = useRequiredFields(gaps, formRef);
  // Ours first (what's missing now), else what the save refused.
  const errorOf = (k: Gap) =>
    required.has(k)
      ? k === 'headline' && headline === 'tooLong'
        ? INTRO_ERRORS.headlineTooLong
        : INTRO_ERRORS[k]
      : errors[k];
  useEffect(() => first.current?.focus(), []);
  // A failed save: focus the first field it names, so its message (wired as
  // the field's description) is read; else the general alert speaks.
  // Keyed on the messages, not the object (a new {} each render would steal
  // focus back while the owner types elsewhere).
  const errorsKey = Object.entries(errors).join('|');
  useEffect(() => {
    if (!errorsKey) return;
    formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  }, [errorsKey]);
  const set = (k: keyof IntroValues) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [k]: e.target.value }));
  // Save stays enabled with gaps: it says what's missing (a disabled button
  // explains nothing). Not while saving.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (saving || !required.check()) return;
    // A frozen headline goes back as it was: the save never sends it.
    onSave(headlineFrozen ? { ...v, headline: initial.headline } : v);
  };
  return (
    <form
      ref={formRef}
      className={styles.form}
      aria-label="Edit your name and headline"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <div className={styles.fields}>
        <FormField compact label="First name" error={errorOf('firstName')}>
          {(c) => (
            <Input
              ref={first}
              {...c}
              data-ff="firstName"
              className={styles.input}
              value={v.firstName}
              onChange={set('firstName')}
              autoComplete="given-name"
              maxLength={NAME_MAX}
              // aria-required, not required: the browser's own block would stop the
              // save before our message could say why.
              aria-required
            />
          )}
        </FormField>
        <FormField compact label="Last name" error={errorOf('lastName')}>
          {(c) => (
            <Input
              {...c}
              data-ff="lastName"
              className={styles.input}
              value={v.lastName}
              onChange={set('lastName')}
              autoComplete="family-name"
              maxLength={NAME_MAX}
              aria-required
            />
          )}
        </FormField>
        <FrozenGroup frozen={headlineFrozen} className={styles.wide}>
          <FormField compact label="Headline" error={errorOf('headline')}>
            {(c) => (
              <Input
                {...c}
                data-ff="headline"
                className={styles.input}
                value={v.headline}
                onChange={set('headline')}
                maxLength={HEADLINE_MAX}
                aria-required
              />
            )}
          </FormField>
        </FrozenGroup>
      </div>
      {errors.general && (
        <p role="alert" className={styles.general}>
          {errors.general}
        </p>
      )}
      <div className={styles.actions}>
        {/* aria-disabled, not disabled: a disabled button drops the focus it has. */}
        <Button
          type="submit"
          size="medium"
          aria-disabled={saving || undefined}
          aria-busy={saving || undefined}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {/* Keyed on the try, so a second Save with gaps is said again. */}
        {required.formError && (
          <span key={required.attempt} role="alert" className={styles.formError}>
            {SAVE_COPY.formError}
          </span>
        )}
        <Button type="button" variant="text" size="medium" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
