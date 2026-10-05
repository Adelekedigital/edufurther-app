'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { PersonalLinkPanel } from '@/components/molecules/PersonalLinkPanel/PersonalLinkPanel';
import { VideoProviderCard } from '@/components/molecules/VideoProviderCard/VideoProviderCard';
import styles from './VideoSection.module.css';

/** Mirrors ConferencingProvider; the section never imports the generated client. */
export type Provider = 'daily' | 'google_meet' | 'custom';

type VideoSectionProps = {
  provider: Provider;
  onPick: (provider: 'daily' | 'google_meet') => void;
  saving: boolean;
  /** Our copy for a failed card save; shown under the group. */
  error: string | null;
  link: string;
  onLinkChange: (value: string) => void;
  savingLink: boolean;
  /** Our copy for a failed "Use this link". */
  linkError: string | null;
  onUseLink: (url: string) => void;
  /** Back to automatic links. The screen decides what that does to the provider. */
  onKeepAutomatic: () => void;
};

/**
 * "Video for sessions" (Integrations.dc.html, `zoomCard=none`): two provider
 * cards and the personal-link escape hatch. No Save button — the design has
 * none and this is one field, so picking saves. The screen announces it.
 *
 * Zoom is absent because the saved default drops it, and because the enum has
 * no `zoom` to send (backend calendar reply #2; more providers are #143).
 */
export function VideoSection({
  provider,
  onPick,
  saving,
  error,
  link,
  onLinkChange,
  savingLink,
  linkError,
  onUseLink,
  onKeepAutomatic,
}: VideoSectionProps) {
  const group = useId();
  const errorId = useId();
  const [panelOpen, setPanelOpen] = useState(false);
  const usingOwn = provider === 'custom';
  const showPanel = panelOpen || usingOwn;
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Video for sessions</h2>
        <span className={styles.subtitle}>
          Pick where your sessions happen. We create a private link for each booking and add it
          to your invite and your mentee’s.
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label="Video provider"
        aria-describedby={error ? errorId : undefined}
        className={styles.grid}
      >
        <VideoProviderCard
          name={group}
          value="daily"
          checked={provider === 'daily'}
          onChange={() => onPick('daily')}
          icon="video_chat"
          tone="blue"
          label="EduFurther video"
          by="Built in · powered by Daily"
          description="A private room for each session. Mentees join from the browser with no account or download."
          benefit="Attendance is tracked, so every session counts in your session analytics."
          idleStatus="Ready to use"
          recommended
        />
        <VideoProviderCard
          name={group}
          value="google_meet"
          checked={provider === 'google_meet'}
          onChange={() => onPick('google_meet')}
          icon="videocam"
          tone="green"
          label="Google Meet"
          by="Uses your Google account"
          description="A new Meet link for each booking, added to your invite and your mentee’s."
          note="Attendance isn’t tracked, so these sessions won’t count in your session analytics."
          idleStatus="Ready to use"
        />
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
      {saving && (
        <span className={styles.saving}>
          <Icon name="progress_activity" size={16} className={styles.spin} />
          Saving…
        </span>
      )}
      {!showPanel && (
        <button type="button" className={styles.disclosure} onClick={() => setPanelOpen(true)}>
          Use a personal meeting link instead
        </button>
      )}
      {showPanel && (
        <PersonalLinkPanel
          value={link}
          onChange={onLinkChange}
          usingOwn={usingOwn}
          saving={savingLink}
          error={linkError}
          onUse={onUseLink}
          onKeepAutomatic={() => {
            setPanelOpen(false);
            onKeepAutomatic();
          }}
        />
      )}
    </section>
  );
}
