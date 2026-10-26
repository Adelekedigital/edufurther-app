import type { ReactNode } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import type { CoverKey } from '@/lib/utils/cover';
import styles from './SignInContext.module.css';

type SignInContextProps = {
  /** Who the line is about (the mentor being booked, or the inviter): their face or initials, never named twice (the text names them). */
  initials: string;
  /** Their colour (`personCover`, the invite code standing in for an id). */
  tone: CoverKey;
  photoUrl?: string | null;
  photoFocus?: { x: number; y: number } | null;
  children: ReactNode;
};

/**
 * Why they are signing in, above the title (Sign In.dc.html `showCtx`):
 * "Log in or sign up to finish booking Gbenga E." on a blue-50 row with the
 * mentor's avatar. The same row says who invited them (issue 281):
 * "Damilola invited you. Sign up and your invite is saved."
 */
export function SignInContext({
  initials,
  tone,
  photoUrl,
  photoFocus,
  children,
}: SignInContextProps) {
  return (
    <div className={styles.row}>
      <Avatar size="sm" initials={initials} tone={tone} src={photoUrl} focus={photoFocus} alt="" />
      <p className={styles.text}>{children}</p>
    </div>
  );
}
