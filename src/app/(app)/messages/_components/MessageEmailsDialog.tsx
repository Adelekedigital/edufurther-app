'use client';

import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Switch } from '@/components/atoms/Switch/Switch';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useMessageSettings, useSaveMessageSettings } from '@/lib/api/data/messages';
import { SETTINGS_COPY } from '@/lib/copy/messages';
import styles from './MessageEmailsDialog.module.css';

/**
 * Message emails (Messages.dc.html `modalPrefs`; PRD "Message emails"): one
 * switch that saves when flipped, the session-window note, and Done, which
 * closes with the on/off toast. A sheet on phones.
 */
export function MessageEmailsDialog({ onDone }: { onDone: (toast: string | null) => void }) {
  const titleId = useId();
  const hintId = useId();
  const settings = useMessageSettings(true);
  const save = useSaveMessageSettings();
  const on = settings.data?.unreadEmails;
  // While a flip is saving, the toast would claim a value that may roll back:
  // Done (and the ×) wait for the answer.
  const saving = save.isPending;
  const close = () => {
    if (saving) return;
    onDone(on === undefined ? null : on ? SETTINGS_COPY.on : SETTINGS_COPY.off);
  };

  return (
    <ModalShell
      title={SETTINGS_COPY.title}
      size="sm"
      mobile="sheet"
      onClose={close}
      closeDisabled={saving}
    >
      <div className={styles.body}>
        <div className={styles.row}>
          <span className={styles.copy}>
            <span id={titleId} className={styles.label}>
              {SETTINGS_COPY.switchLabel}
            </span>
            <span id={hintId} className={styles.hint}>
              {SETTINGS_COPY.switchHint}
            </span>
          </span>
          {on === undefined ? (
            settings.error ? null : (
              <Skeleton width="39px" height="24px" radius="full" />
            )
          ) : (
            <Switch
              checked={on}
              aria-labelledby={titleId}
              aria-describedby={hintId}
              className={styles.switch}
              onChange={(next) => save.mutate({ unreadEmails: next })}
            />
          )}
        </div>
        {settings.error && !settings.data && (
          <p className={styles.error} role="alert">
            {SETTINGS_COPY.loadError}{' '}
            <Button variant="text" size="small" onClick={settings.retry}>
              {SETTINGS_COPY.tryAgain}
            </Button>
          </p>
        )}
        {save.isError && (
          <p className={styles.error} role="alert">
            {SETTINGS_COPY.saveError}
          </p>
        )}
        <div className={styles.note}>
          <Icon name="schedule" size={18} className={styles.noteIcon} />
          <span>{SETTINGS_COPY.sessionNote}</span>
        </div>
        <Button size="large" fullWidth busy={saving} onClick={close}>
          {SETTINGS_COPY.done}
        </Button>
      </div>
    </ModalShell>
  );
}
