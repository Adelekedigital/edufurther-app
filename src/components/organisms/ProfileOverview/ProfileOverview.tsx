'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { FactTile } from '@/components/molecules/FactTile/FactTile';
import { IconListItem } from '@/components/molecules/IconListItem/IconListItem';
import { SocialLink } from '@/components/molecules/SocialLink/SocialLink';
import { cx } from '@/lib/utils/cx';
import type { MentorProfile } from '@/types/mentor';
import { movedBetween } from '@/lib/utils/format';
import styles from './ProfileOverview.module.css';

type ProfileOverviewProps = {
  profile: MentorProfile;
};

/**
 * The Overview tab (Mentor Profile.dc.html): About, social links, Education,
 * Scholarships and awards, Background. A section with nothing in it is left
 * out, as the design does for a viewer who can't edit. Awards carry no funding
 * badge: the API has no funding field.
 */
export function ProfileOverview({ profile }: ProfileOverviewProps) {
  const p = profile;
  const facts = [
    p.originCountry && { icon: 'home_pin', tone: 'green', label: 'From', value: p.originCountry },
    p.studyCountry && { icon: 'school', tone: 'blue', label: 'Studied in', value: p.studyCountry },
    p.languages.length > 0 && {
      icon: 'translate',
      tone: 'gold',
      label: 'Mentors in',
      value: p.languages.join(', '),
    },
  ].filter(Boolean) as {
    icon: 'home_pin' | 'school' | 'translate';
    tone: 'green' | 'blue' | 'gold';
    label: string;
    value: string;
  }[];
  // "…to the United States": the same rule as the first-mentees card (copy
  // fix made here, design-divergence.md).
  const move = movedBetween(p.originCountry, p.studyCountry);
  const moved = move
    ? `Has made the move from ${move.from} to ${move.to}, a path many mentees are planning.`
    : null;

  return (
    <div className={styles.overview}>
      {(p.about || p.socials.length > 0) && (
        <section className={styles.section} aria-labelledby="about-h">
          <h2 id="about-h" className={styles.h2}>
            About
          </h2>
          {p.about && <About text={p.about} />}
          {p.socials.length > 0 && (
            <div className={styles.socials}>
              {p.socials.map((s) => (
                <SocialLink key={s.kind} kind={s.kind} href={s.href} />
              ))}
            </div>
          )}
        </section>
      )}

      {p.education.length > 0 && (
        <section className={styles.section} aria-labelledby="edu-h">
          <h2 id="edu-h" className={styles.h2}>
            Education
          </h2>
          <div className={styles.list}>
            {p.education.map((e) => (
              <IconListItem key={e.id} icon="school" tone="blue" title={e.title} meta={e.meta} />
            ))}
          </div>
        </section>
      )}

      {p.awards.length > 0 && (
        <section className={styles.section} aria-labelledby="awards-h">
          <h2 id="awards-h" className={styles.h2}>
            Scholarships and awards
          </h2>
          <div className={styles.list}>
            {p.awards.map((a) => (
              <IconListItem
                key={a.id}
                icon="workspace_premium"
                tone="gold"
                title={a.title}
                meta={a.meta}
              />
            ))}
          </div>
        </section>
      )}

      {facts.length > 0 && (
        <section className={styles.section} aria-labelledby="bg-h">
          <h2 id="bg-h" className={styles.h2}>
            Background
          </h2>
          <div className={styles.facts}>
            {facts.map((f) => (
              <FactTile key={f.label} {...f} />
            ))}
          </div>
          {moved && (
            <p className={styles.moved}>
              <Icon name="flight_takeoff" size={16} className={styles.movedIcon} />
              {moved}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/** Three lines, then "Show more" — only when the text really is longer. */
function About({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);
  return (
    <>
      <p ref={ref} id="about-text" className={cx(styles.about, !open && styles.clamped)}>
        {text}
      </p>
      {(overflows || open) && (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="about-text"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}
