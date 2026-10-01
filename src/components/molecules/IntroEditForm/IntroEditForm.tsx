'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { FormField } from '@/components/molecules/FormField/FormField';
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
};

/**
 * The owner's name and headline, edited in place of the header's intro
 * (Mentor Profile.dc.html `editingIntro`). The design draws one "Name" field;
 * the account stores first and last names apart, so there are two
 * (design-divergence.md). A blank first name is refused by the save, with a
 * message (names can't be cleared).
 * Escape cancels. The first field has focus on open.
 */
export function IntroEditForm({
  initial,
  onSave,
  onCancel,
  saving,
  errors = {},
}: IntroEditFormProps) {
  const [v, setV] = useState(initial);
  // Leaving with edits asks first (any in-app link, Logout, the browser's prompt).
  useLeaveGuard(JSON.stringify(v) !== JSON.stringify(initial), 'your intro');
  const first = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
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
  // Save stays enabled with a blank first name: the save says why it can't
  // (a disabled button explains nothing; review of #78). Not while saving.
  const canSave = !saving;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canSave) onSave(v);
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
        <FormField compact label="First name" error={errors.firstName}>
          {(c) => (
            <Input
              ref={first}
              {...c}
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
        <FormField compact label="Last name" error={errors.lastName}>
          {(c) => (
            <Input
              {...c}
              className={styles.input}
              value={v.lastName}
              onChange={set('lastName')}
              autoComplete="family-name"
              maxLength={NAME_MAX}
            />
          )}
        </FormField>
        <div className={styles.wide}>
          <FormField compact label="Headline" error={errors.headline}>
            {(c) => (
              <Input
                {...c}
                className={styles.input}
                value={v.headline}
                onChange={set('headline')}
                maxLength={HEADLINE_MAX}
              />
            )}
          </FormField>
        </div>
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
        <Button type="button" variant="text" size="medium" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
