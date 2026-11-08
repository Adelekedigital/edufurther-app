/**
 * Preview as user copy (AppShell.dc.html "View as user (admin)", View As.dc.html,
 * PRD "Admin Preview as user"). The feature is "Preview as user" everywhere;
 * "View as mentee" is the separate profile-only preview.
 */
import type { PreviewEndReason, PreviewRole } from '@/lib/api/data/previewStore';

/** Which deployment this is: named on the chip and in the Read only notice (PRD Q2). */
export type AppEnv = 'production' | 'staging' | 'development';

const ENV_NAME: Record<AppEnv, string> = {
  production: 'Production',
  staging: 'Staging',
  development: 'Development',
};

export const PREVIEW_COPY = {
  region: 'Preview as user',
  lead: 'Preview as',
  entry: 'Preview as user',
  choose: 'Choose a user',
  chooseAria: 'Choose a user to preview as',
  switchAria: (email: string) => `Previewing as ${email}. Switch user`,
  role: (role: PreviewRole) => (role === 'mentor' ? 'Mentor' : 'Mentee'),
  who: (name: string, role: PreviewRole) => `${name} · ${role === 'mentor' ? 'Mentor' : 'Mentee'}`,
  chip: (env: AppEnv) => `${ENV_NAME[env]} · Read only`,
  chipShort: 'Read only',
  exit: 'Exit preview',
  exitShort: 'Exit',
  exitAria: 'Exit preview',
  picker: {
    panel: 'Choose a user to preview as',
    list: 'Users',
    search: 'Search users by email or name',
    placeholder: 'Search by email or name',
    roles: 'Filter by role',
    all: 'All',
    mentors: 'Mentors',
    mentees: 'Mentees',
    loading: 'Loading users',
    error: 'We couldn’t load users.',
    retry: 'Try again',
    noMatch: (q: string) => `No users match “${q}”.`,
    miss: (value: string) => `No user matches “${value}”. Pick someone below.`,
    // Provisional (no design): a start or switch that failed for another reason.
    startFailed: 'We couldn’t open that preview. Try again.',
    loadingMore: 'Loading more users',
    moreFailed: 'We couldn’t load more users.',
  },
  readOnly: {
    title: 'Read only',
    body: (envName: string) => ({
      before: 'You’re previewing as ',
      after: ` in ${envName.toLowerCase()}, so nothing was saved or sent. You can still look around.`,
    }),
    ok: 'Got it',
  },
  ended: {
    title: 'Preview ended',
    body: (name: string, reason: PreviewEndReason) =>
      reason === 'max_length'
        ? `Your preview of ${name} ended after 2 hours, the longest a preview can run. Start a new one from the preview icon.`
        : `Your preview of ${name} ended after 30 minutes without activity. Start a new one from the preview icon.`,
    ok: 'Got it',
  },
  envName: (env: AppEnv) => ENV_NAME[env],
} as const;
