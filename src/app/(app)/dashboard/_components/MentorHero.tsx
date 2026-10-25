/* eslint-disable @next/next/no-img-element -- static decorative SVG; next/image adds nothing for vector art */
import type { ReactNode } from 'react';
import styles from './MentorHero.module.css';

type MentorHeroProps = {
  /** The small caps line; it also names the section for assistive tech. */
  eyebrow: string;
  title: string;
  body: string;
  /** The bands under the intro (the booking card, status rows, moves). */
  children?: ReactNode;
};

/**
 * Mentor Dashboard v2 new-mentor hero (`isNew` branch): a blue intro band with
 * the team illustration, then the bands its stage needs, each divided by a
 * hairline. Presentational: the screen decides the stage and fetches.
 */
export function MentorHero({ eyebrow, title, body, children }: MentorHeroProps) {
  return (
    <section aria-label={eyebrow} className={styles.hero}>
      <div className={styles.intro}>
        <img
          src="/illustrations/team.svg"
          alt=""
          width={120}
          height={120}
          className={styles.illus}
        />
        <div className={styles.text}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.body}>{body}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** The hero's status rows band: a wrapping grid, a hairline under it. */
export function HeroRows({ children }: { children: ReactNode }) {
  return <div className={styles.rows}>{children}</div>;
}
