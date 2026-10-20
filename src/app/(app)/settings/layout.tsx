import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SettingsScreen } from './_components/SettingsScreen';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Your details, what you’re working toward, and how you sign in.',
};

/**
 * The screen lives here, not in the tab's page, so a move between tabs keeps
 * it mounted (and an unsaved edit with it). The pages render nothing.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SettingsScreen />
      {children}
    </>
  );
}
