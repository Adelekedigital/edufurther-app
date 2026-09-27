'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input } from '@/components/atoms/Input/Input';
import styles from './TimezonePicker.module.css';

/** From TimezonePicker.dc.html. A zone not listed here shows its IANA name. */
export const ZONES: ReadonlyArray<readonly [id: string, label: string]> = [
  ['Africa/Lagos', 'Lagos (WAT)'],
  ['Europe/London', 'London (UK)'],
  ['America/New_York', 'New York (ET)'],
  ['America/Chicago', 'Chicago (CT)'],
  ['America/Los_Angeles', 'Los Angeles (PT)'],
  ['Europe/Berlin', 'Berlin (CET)'],
  ['Africa/Nairobi', 'Nairobi (EAT)'],
  ['Asia/Dubai', 'Dubai (GST)'],
  ['Asia/Kolkata', 'India (IST)'],
  ['Australia/Sydney', 'Sydney (AET)'],
];

export function zoneLabel(id: string): string {
  return ZONES.find(([z]) => z === id)?.[1] ?? id.replace(/_/g, ' ');
}

type TimezonePickerProps = {
  value: string;
  onChange: (zone: string) => void;
  /** The device's zone, offered as a one-tap shortcut when it differs. */
  deviceZone: string;
  prefix?: string;
};

/** Inline "Times shown in Lagos (WAT) ✎" switcher. */
export function TimezonePicker({
  value,
  onChange,
  deviceZone,
  prefix = 'Times shown in',
}: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const close = (restoreFocus = true) => {
    setOpen(false);
    setQ('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (zone: string) => {
    onChange(zone);
    close();
  };
  const needle = q.trim().toLowerCase();
  const list = ZONES.filter(
    ([id, label]) => !needle || (id + label).toLowerCase().includes(needle),
  );

  return (
    <span
      ref={wrapRef}
      className={styles.wrap}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <span>{prefix}</span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {zoneLabel(value)}
        <Icon name="edit" size={14} />
        <span className="sr-only">, change time zone</span>
      </button>
      {open && (
        <div id={panelId} className={styles.panel}>
          <Input
            autoFocus
            aria-label="Search time zones"
            placeholder="Search city or zone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {deviceZone !== value && !needle && (
            <button type="button" className={styles.device} onClick={() => pick(deviceZone)}>
              <Icon name="my_location" size={16} />
              Use my device’s zone ({zoneLabel(deviceZone)})
            </button>
          )}
          <ul className={styles.list}>
            {list.map(([id, label]) => (
              <li key={id}>
                <button
                  type="button"
                  className={styles.option}
                  aria-current={id === value ? 'true' : undefined}
                  onClick={() => pick(id)}
                >
                  {label}
                  {id === value && <Icon name="check" size={16} />}
                </button>
              </li>
            ))}
          </ul>
          {list.length === 0 && <p className={styles.none}>No matching zones</p>}
        </div>
      )}
    </span>
  );
}
