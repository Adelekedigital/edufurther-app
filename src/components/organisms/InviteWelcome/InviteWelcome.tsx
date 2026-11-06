import { ButtonLink } from '@/components/atoms/Button/Button';
import { Tag } from '@/components/atoms/Tag/Tag';
import { ArrivalRow } from '@/components/molecules/ArrivalRow/ArrivalRow';
import { IconListItem } from '@/components/molecules/IconListItem/IconListItem';
import { INVITE_LANDING_COPY as COPY } from '@/lib/copy/invite';
import type { CoverKey } from '@/lib/utils/cover';
import styles from './InviteWelcome.module.css';

export type WelcomeInviter = { firstName: string; photoUrl: string | null; tone: CoverKey };

type InviteWelcomeProps = {
  /** Who sent it; null for a link that can't be joined (the broken version). */
  inviter: WelcomeInviter | null;
  /** "Our mentors studied at": shown when given (the page hides a short or failed list). */
  schools: string[] | null;
  signUpHref: string;
  browseHref: string;
};

/**
 * Invite Landing.dc.html, screen 1 (`step=welcome`, saved defaults): who
 * invited you (or, for a broken link, a generic eyebrow), the pitch, three
 * benefits, the schools strip, then Create my account and Browse mentors
 * first. Props only: the page decides which version and fetches the strip.
 */
export function InviteWelcome({ inviter, schools, signUpHref, browseHref }: InviteWelcomeProps) {
  const first = inviter?.firstName ?? null;
  return (
    <div className={styles.welcome}>
      <div className={styles.top}>
        {inviter ? (
          <ArrivalRow
            initial={inviter.firstName.charAt(0).toUpperCase()}
            tone={inviter.tone}
            photoUrl={inviter.photoUrl}
            kicker={COPY.kicker(inviter.firstName)}
            you={COPY.you}
            perk={COPY.perk}
          />
        ) : (
          <p className={styles.eyebrow}>{COPY.broken.eyebrow}</p>
        )}
        <h1 className={styles.title}>{first ? COPY.title(first) : COPY.broken.title}</h1>
        <p className={styles.sub}>{first ? COPY.sub : COPY.broken.sub}</p>
      </div>
      <ul aria-label={COPY.benefitsLabel} className={styles.benefits}>
        {COPY.benefits.map((b) => (
          <IconListItem
            key={b.icon}
            as="li"
            variant="feature"
            icon={b.icon}
            tone="blue"
            title={b.title}
            meta={b.body}
          />
        ))}
      </ul>
      {schools && schools.length > 0 && (
        <div className={styles.schools}>
          <h2 className={styles.caption}>{COPY.schoolsLabel}</h2>
          <ul className={styles.pills}>
            {schools.map((s) => (
              <Tag key={s} as="li" tone="outline">
                {s}
              </Tag>
            ))}
          </ul>
        </div>
      )}
      {/* No prefetch: Next cancels its own prefetch streams and page review
          counts them as failures (failure log #25). */}
      <div className={styles.actions}>
        <ButtonLink href={signUpHref} prefetch={false} variant="primary" size="large" fullWidth>
          {COPY.signUp}
        </ButtonLink>
        <ButtonLink
          href={browseHref}
          prefetch={false}
          variant="ghost"
          size="medium"
          icon="arrow_forward"
          iconPosition="trailing"
          className={styles.browse}
        >
          {COPY.browse}
        </ButtonLink>
      </div>
    </div>
  );
}
