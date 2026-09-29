'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
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
 * (design-divergence.md). Save needs a first name (names can't be cleared).
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
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  const set = (k: keyof IntroValues) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [k]: e.target.value }));
  const canSave = !!v.firstName.trim() && !saving;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canSave) onSave(v);
  };
  return (
    <form
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
              required
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
        <Button type="submit" size="medium" disabled={!canSave} aria-busy={saving || undefined}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="text" size="medium" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
