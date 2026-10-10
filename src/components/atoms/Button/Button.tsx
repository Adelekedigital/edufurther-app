import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils/cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/iconNames';
import styles from './Button.module.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary-outlined'
  | 'text'
  | 'text-destructive'
  | 'dark'
  | 'destructive';
/**
 * Sizes follow placement, variants follow importance (CTA Hierarchy.dc.html,
 * replacing the one-size #28 rule). Labels are DM Sans semibold (ADR 0002).
 * large  — 48px, padding 16px 24px (phones 16px), 14px label. The one action
 *          that moves a page, flow or modal footer forward; empty/error states.
 * medium — 40px, padding 12px 20px, 14px label. A card's or section's action.
 *          The default.
 * small  — 32px, padding 8px 16px, 12px label. Rows and dense lists.
 * On phones medium and small keep their drawn height; an invisible 44px tap
 * area sits around them.
 */
export type ButtonSize = 'large' | 'medium' | 'small';

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: IconName;
  iconPosition?: 'leading' | 'trailing';
  children: ReactNode;
};

function classes({
  variant = 'primary',
  // A card's or section's action is the common case (CTA hierarchy default).
  size = 'medium',
  fullWidth,
  className,
}: Pick<Common, 'variant' | 'size' | 'fullWidth'> & { className?: string }) {
  return cx(styles.button, styles[variant], styles[size], fullWidth && styles.full, className);
}

function Content({
  icon,
  iconPosition = 'leading',
  children,
}: Pick<Common, 'icon' | 'iconPosition' | 'children'>) {
  const glyph = icon ? <Icon name={icon} size={18} /> : null;
  return (
    <>
      {iconPosition === 'leading' && glyph}
      <span className={styles.label}>{children}</span>
      {iconPosition === 'trailing' && glyph}
    </>
  );
}

export type ButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    /** Busy is distinct from disabled: it says why, and stays in the tab order. */
    busy?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    fullWidth,
    icon,
    iconPosition,
    busy,
    className,
    children,
    disabled,
    onClick,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={classes({ variant, size, fullWidth, className })}
      {...rest}
      // Kept after ...rest: a busy button must not submit twice, whatever the caller passes.
      disabled={disabled}
      aria-busy={busy || undefined}
      onClick={busy ? (e) => e.preventDefault() : onClick}
    >
      <Content icon={icon} iconPosition={iconPosition}>
        {children}
      </Content>
    </button>
  );
});

export type ButtonLinkProps = Common &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> & {
    href: string;
    /** Passed to next/link. Off for routes that don't exist yet (they stall prefetch). */
    prefetch?: boolean;
  };

/** A button-styled link: it navigates, so it is an <a>. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant, size, fullWidth, icon, iconPosition, className, children, href, prefetch, ...rest },
  ref,
) {
  return (
    <Link
      ref={ref}
      href={href}
      prefetch={prefetch}
      className={classes({ variant, size, fullWidth, className })}
      {...rest}
    >
      <Content icon={icon} iconPosition={iconPosition}>
        {children}
      </Content>
    </Link>
  );
});
