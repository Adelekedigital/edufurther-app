import type { ReactNode } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import type { CoverKey } from '@/lib/utils/cover';
import styles from './SignInContext.module.css';

type SignInContextProps = {
  /** Whose booking this is: their face or initials, never named twice (the text names them). */
  initials: string;
  /** The mentor's colour (`personCover`). */
  tone: CoverKey;
  photoUrl?: string | null;
  photoFocus?: { x: number; y: number } | null;
  children: ReactNode;
};

/**
 * Why they are signing in, above the title (Sign In.dc.html `showCtx`):
 * "Log in or sign up to finish booking Gbenga E." on a blue-50 row with the
 * mentor's avatar.
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
