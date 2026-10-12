import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Card.module.css';

export type CardTone = 'default' | 'info' | 'success';
/**
 * md — 16px. lg — 20px, 16px on phones (the drawn cards' phone rule).
 * none — the caller pads it (a card whose padding the design draws otherwise).
 */
export type CardPadding = 'none' | 'md' | 'lg';

type CardStyle = { tone?: CardTone; padding?: CardPadding; className?: string };

/**
 * The card surface's class, for an element Card can't render itself (a
 * next/link, a <label> wrapping a radio). Layout stays the caller's.
 */
export function cardClass({ tone = 'default', padding = 'lg', className }: CardStyle = {}) {
  return cx(
    styles.card,
    tone !== 'default' && styles[tone],
    padding !== 'none' && styles[padding],
    className,
  );
}

type CardProps = CardStyle &
  HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'section' | 'article' | 'aside' | 'li';
  };

/**
 * The app's card: hairline --border-subtle, --radius-xl, white (Mentor
 * Profile, Calendar v2, Session Types, Integrations .dc.html cards). Tinted
 * blue (info) or green (success) for the drawn callout cards. Surface only:
 * the caller's class lays out what's inside.
 */
export function Card({ as: Tag = 'div', tone, padding, className, ...rest }: CardProps) {
  return <Tag className={cardClass({ tone, padding, className })} {...rest} />;
}
