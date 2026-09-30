import { CountryPicker } from '@/components/molecules/CountryPicker/CountryPicker';
import { FormField } from '@/components/molecules/FormField/FormField';
import {
  LanguagePicker,
  type LanguageOption,
} from '@/components/molecules/LanguagePicker/LanguagePicker';
import styles from './BackgroundFields.module.css';

export type BackgroundValues = {
  originId: string;
  studyId: string;
  languages: LanguageOption[];
};
export type BackgroundErrors = Partial<Record<'origin' | 'study' | 'languages', string>>;

type BackgroundFieldsProps = {
  values: BackgroundValues;
  onChange: (next: BackgroundValues) => void;
  countries: { id: string; label: string }[];
  languages: {
    results: LanguageOption[];
    query: string;
    onQueryChange: (q: string) => void;
    status: 'loading' | 'error' | 'ready';
    onRetry: () => void;
  };
  errors?: BackgroundErrors;
};

/**
 * "Edit background" (ProfileItemModal.dc.html `background`): where the mentor
 * is from, where they studied, and the languages they mentor in. Rendered as
 * siblings, so the modal's own gap spaces them as drawn.
 */
export function BackgroundFields({
  values,
  onChange,
  countries,
  languages,
  errors = {},
}: BackgroundFieldsProps) {
  const toggle = (l: LanguageOption) =>
    onChange({
      ...values,
      languages: values.languages.some((x) => x.id === l.id)
        ? values.languages.filter((x) => x.id !== l.id)
        : [...values.languages, l],
    });
  return (
    <>
      <div className={styles.row}>
        <FormField label="From" error={errors.origin}>
          {(c) => (
            <CountryPicker
              {...c}
              options={countries}
              value={values.originId}
              onChange={(id) => onChange({ ...values, originId: id })}
            />
          )}
        </FormField>
        <FormField label="Studied in" error={errors.study}>
          {(c) => (
            <CountryPicker
              {...c}
              options={countries}
              value={values.studyId}
              onChange={(id) => onChange({ ...values, studyId: id })}
            />
          )}
        </FormField>
      </div>
      <LanguagePicker
        label="Languages you mentor in"
        selected={values.languages}
        onToggle={toggle}
        error={errors.languages}
        {...languages}
      />
    </>
  );
}
