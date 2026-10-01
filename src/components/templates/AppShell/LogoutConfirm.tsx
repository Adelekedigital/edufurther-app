'use client';

import { Button } from '@/components/atoms/Button/Button';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import styles from './AppShell.module.css';

/**
 * Logout while a form has unsaved changes (review of PR 127). The project's
 * confirm pattern (a danger ModalShell, the safe choice first, the filled
 * action last). PROVISIONAL copy, ours until design draws it.
 */
export function LogoutConfirm({ onKeep, onLogout }: { onKeep: () => void; onLogout: () => void }) {
  return (
    <ModalShell
      title="Log out with unsaved changes?"
      subtitle="Your changes on this page haven’t been saved. If you log out now, they’ll be lost."
      icon="logout"
      tone="danger"
      size="sm"
      onClose={onKeep}
    >
      <div className={styles.confirmButtons}>
        <Button size="large" variant="secondary-outlined" fullWidth onClick={onKeep}>
          Keep editing
        </Button>
        <Button size="large" variant="destructive" fullWidth onClick={onLogout}>
          Log out
        </Button>
      </div>
    </ModalShell>
  );
}
