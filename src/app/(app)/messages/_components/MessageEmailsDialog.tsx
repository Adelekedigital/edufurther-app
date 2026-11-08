'use client';

import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { SwitchRow } from '@/components/molecules/SwitchRow/SwitchRow';
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
        <SwitchRow
          label={SETTINGS_COPY.switchLabel}
          hint={SETTINGS_COPY.switchHint}
          checked={!!on}
          loading={on === undefined && !settings.error}
          noSwitch={on === undefined && !!settings.error}
          // One save at a time: a second flip mid-save could land out of order.
          disabled={saving}
          onChange={(next) => save.mutate({ unreadEmails: next })}
          classes={{
            row: styles.row,
            text: styles.copy,
            label: styles.label,
            hint: styles.hint,
            switch: styles.switch,
          }}
        />
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
