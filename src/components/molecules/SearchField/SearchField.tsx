'use client';

import { useId, useRef, type FormEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Input } from '@/components/atoms/Input/Input';
import styles from './SearchField.module.css';

type SearchFieldProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  /** Enter: apply now rather than after the debounce (Design decisions §1). */
  onSubmit?: (value: string) => void;
  /** × clears only the query (Design decisions §1). */
  onClear: () => void;
  disabled?: boolean;
  /**
   * The label shown above the field, and no search glyph (Admin.dc.html
   * "Find a mentee"). Default: the label is for screen readers, a glyph leads.
   */
  labelled?: boolean;
};

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  onClear,
  disabled,
  labelled = false,
}: SearchFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.(value);
  };
  const control = (
    <>
      {!labelled && <Icon name="search" size={20} className={styles.icon} />}
      <Input
        ref={inputRef}
        id={id}
        type="search"
        fieldSize="lg"
        padStart={!labelled}
        padEnd
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        enterKeyHint="search"
        onChange={(e) => onChange(e.target.value)}
      />
      {value && !disabled && (
        <IconButton
          icon="close"
          size="sm"
          aria-label="Clear search"
          className={styles.clear}
          onClick={() => {
            onClear();
            inputRef.current?.focus();
          }}
        />
      )}
    </>
  );
  return (
    <form
      role="search"
      className={labelled ? styles.labelled : styles.field}
      onSubmit={handleSubmit}
    >
      <label htmlFor={id} className={labelled ? styles.label : 'sr-only'}>
        {label}
      </label>
      {labelled ? <div className={styles.field}>{control}</div> : control}
    </form>
  );
}
