'use client';

import { useId } from 'react';
import { VideoProviderCard } from '@/components/molecules/VideoProviderCard/VideoProviderCard';
import { VideoProviderRow } from '@/components/molecules/VideoProviderRow/VideoProviderRow';
import {
  CUSTOM_COPY,
  DAILY_COPY,
  MEET_COPY,
  VIDEO_COPY,
  type VideoChoice,
} from '@/lib/copy/integrations';
import styles from './VideoSection.module.css';

type VideoSectionProps = {
  /** What the server holds. Picking does not move it; confirming does. */
  provider: VideoChoice;
  /** Opens the switch confirm. Nothing is saved here (PRD decision 2). */
  onPick: (provider: 'daily' | 'google_meet') => void;
  /** Shown read-only when the account is on a personal link. */
  customUrl: string | null;
  /** Off inside a modal, whose own title and subtitle say the same (Calendar). */
  heading?: boolean;
};

/**
 * "Video for sessions" (Integrations.dc.html, `videoLayout=primary`): the
 * recommended provider drawn large, then its alternatives as compact rows. The
 * layout is the recommendation, which is why the two are different shapes.
 *
 * No Save button and no optimistic selection: a pick opens the switch confirm
 * and the radio stays on the saved provider until the PATCH lands. Arrow keys
 * move through a native radio group, so this is also what stops a traversal
 * from firing one save per keystroke.
 *
 * Zoom is absent because the saved default drops it, and because the enum has
 * no `zoom` to send (backend calendar reply #2; more providers are #143).
 * The personal meeting link is absent because the page no longer offers one
 * (PRD decision 1); `custom` is reachable only through support.
 */
export function VideoSection({ provider, onPick, customUrl, heading = true }: VideoSectionProps) {
  const group = useId();
  const usingCustom = provider === 'custom';
  return (
    <section className={styles.section}>
      {heading && (
        <div className={styles.heading}>
          <h2 className={styles.title}>{VIDEO_COPY.title}</h2>
          <span className={styles.subtitle}>{VIDEO_COPY.sub}</span>
        </div>
      )}
      <div role="radiogroup" aria-label={VIDEO_COPY.groupLabel} className={styles.group}>
        <VideoProviderCard
          name={group}
          value="daily"
          checked={provider === 'daily'}
          onChange={() => onPick('daily')}
          icon="video_chat"
          tone="blue"
          label={DAILY_COPY.label}
          by={DAILY_COPY.by}
          description={DAILY_COPY.desc}
          benefit={DAILY_COPY.benefit}
          recommended
        />
        <span className={styles.otherLabel}>
          {usingCustom ? VIDEO_COPY.otherOptions : VIDEO_COPY.otherOption}
        </span>
        {/* The by-line ("Hosted by EduFurther · no Google account needed") is
            deliberately not here: the drawn row has one line under its label,
            and the booked-length note is the one a mentor is choosing on. */}
        <VideoProviderRow
          name={group}
          value="google_meet"
          checked={provider === 'google_meet'}
          onChange={() => onPick('google_meet')}
          icon="videocam"
          tone="green"
          label={MEET_COPY.label}
          note={MEET_COPY.note}
        />
        {/* PROVISIONAL — undrawn (PRD: "for the designer"). Read-only, and with
            no handler, because there is no route back to it from this page. */}
        {usingCustom && (
          <VideoProviderCard
            name={group}
            value="custom"
            checked
            icon="link"
            tone="blue"
            label={CUSTOM_COPY.label}
            by={customUrl ?? undefined}
            description={CUSTOM_COPY.note}
          />
        )}
      </div>
    </section>
  );
}
