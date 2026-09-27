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
};

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  onClear,
  disabled,
}: SearchFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.(value);
  };
  return (
    <form role="search" className={styles.field} onSubmit={handleSubmit}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon name="search" size={20} className={styles.icon} />
      <Input
        ref={inputRef}
        id={id}
        type="search"
        fieldSize="lg"
        padStart
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
    </form>
  );
}
