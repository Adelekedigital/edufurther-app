'use client';

import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './VideoProviderForm.module.css';

type Provider = 'daily' | 'google_meet' | 'custom';

type VideoProviderFormProps = {
  initial: Provider;
  /** The mentor's own room link, when that's their current choice. */
  customUrl: string | null;
  saving: boolean;
  /** Our copy for a save that failed; the page announces it. */
  error: string | null;
  onCancel: () => void;
  onSave: (provider: Provider) => void;
};

type Option = {
  key: Provider;
  label: string;
  icon: IconName;
  tone: 'blue' | 'green';
  desc: string;
  recommended?: boolean;
};

/** Calendar v2 `videoOpts`, without Zoom (product 2026-10-01; more providers: #143). */
const OPTIONS: Option[] = [
  {
    key: 'daily',
    label: 'EduFurther video',
    icon: 'video_chat',
    tone: 'blue',
    recommended: true,
    desc: 'A private room for each session. Mentees join from the browser, no account needed.',
  },
  {
    key: 'google_meet',
    label: 'Google Meet',
    icon: 'videocam',
    tone: 'green',
    // Ours: the link is made on EduFurther's calendar (backend reply #2), so we
    // don't promise "added to both Google Calendars".
    desc: 'A new Meet link for each booking, added to your invite and your mentee’s.',
  },
];

/**
 * The "Video for sessions" modal body (Calendar v2 `videoOpen`): one radio
 * card per provider (arrow keys move and pick), then Cancel / Save. A personal
 * link appears only when it's already the mentor's choice (set elsewhere).
 */
export function VideoProviderForm({
  initial,
  customUrl,
  saving,
  error,
  onCancel,
  onSave,
}: VideoProviderFormProps) {
  const [value, setValue] = useState<Provider>(initial);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const options: Option[] =
    initial === 'custom'
      ? [
          ...OPTIONS,
          {
            key: 'custom',
            label: 'Personal meeting link',
            icon: 'link',
            tone: 'blue',
            desc: customUrl ?? 'Your own room link.',
          },
        ]
      : OPTIONS;
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const j = (i + step + options.length) % options.length;
    setValue(options[j]!.key);
    cards.current[j]?.focus();
  };
  return (
    <div className={styles.body}>
      <div role="radiogroup" aria-label="Video provider" className={styles.options}>
        {options.map((o, i) => {
          const on = value === o.key;
          return (
            <button
              key={o.key}
              ref={(el) => {
                cards.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={cx(styles.card, on && styles.on)}
              onClick={() => setValue(o.key)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span aria-hidden className={cx(styles.tile, styles[o.tone])}>
                <Icon name={o.icon} size={22} />
              </span>
              <span className={styles.text}>
                <span className={styles.label}>
                  {o.label}
                  {o.recommended && (
                    <Badge type="accent" color="primary" size="sm">
                      Recommended
                    </Badge>
                  )}
                </span>
                <span className={styles.desc}>{o.desc}</span>
                <span className={styles.status}>
                  <Icon name="check_circle" size={14} />
                  {/* Ours: Meet no longer waits on a Google connection (backend reply #2). */}
                  {o.key === 'custom' ? 'Reused for every session' : 'Ready to use'}
                </span>
              </span>
              <span aria-hidden className={styles.radio} />
            </button>
          );
        })}
      </div>
      {/* The design's line, restored now that the page it points at exists. */}
      <p className={styles.managed}>
        Connections and personal links are managed in{' '}
        <Link href="/integrations" prefetch={false}>
          Integrations
        </Link>
        .
      </p>
      {error && (
        <p className={styles.error}>
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button
          size="large"
          variant="secondary-outlined"
          fullWidth
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button size="large" fullWidth busy={saving} onClick={() => onSave(value)}>
          Save
        </Button>
      </div>
    </div>
  );
}
