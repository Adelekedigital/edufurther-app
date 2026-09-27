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

export type ButtonVariant = 'primary' | 'secondary-outlined' | 'text' | 'dark';
/**
 * compact — in-app CTA: Inter semibold 12/16, 32px, 44px under 768px (handoff §7.1).
 * sm      — DS spec-sheet button, 37px, Poppins bold.
 * lg      — DS product button, 56px, Poppins bold.
 */
export type ButtonSize = 'compact' | 'sm' | 'lg';

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
  size = 'compact',
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
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> & { href: string };

/** A button-styled link: it navigates, so it is an <a>. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant, size, fullWidth, icon, iconPosition, className, children, href, ...rest },
  ref,
) {
  return (
    <Link
      ref={ref}
      href={href}
      className={classes({ variant, size, fullWidth, className })}
      {...rest}
    >
      <Content icon={icon} iconPosition={iconPosition}>
        {children}
      </Content>
    </Link>
  );
});
