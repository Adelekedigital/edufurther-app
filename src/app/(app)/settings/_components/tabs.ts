import type { SettingsTab } from '@/lib/copy/settings';

/** The mentee's tabs, as each one ships (PRD: Mentee Settings, PRs 4–7). */
export const MENTEE_TABS: SettingsTab[] = ['profile', 'goals', 'education', 'security'];
export const DEFAULT_TAB: SettingsTab = 'profile';

/** The mentor's tabs, as each one ships (PRD: Mentor Settings, PRs 4–8). */
export const MENTOR_TABS: SettingsTab[] = ['booking'];
export const MENTOR_DEFAULT_TAB: SettingsTab = 'booking';
