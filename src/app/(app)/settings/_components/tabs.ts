import type { SettingsTab } from '@/lib/copy/settings';
import { inSetup, type Access } from '@/lib/utils/access';

/** The mentee's tabs, as each one ships (PRD: Mentee Settings, PRs 4–7). */
export const MENTEE_TABS: SettingsTab[] = ['profile', 'goals', 'education', 'security'];
export const DEFAULT_TAB: SettingsTab = 'profile';

/** The mentor's tabs, as each one ships (PRD: Mentor Settings, PRs 4–8). */
export const MENTOR_TABS: SettingsTab[] = ['booking', 'profile', 'expertise', 'links', 'security'];
export const MENTOR_DEFAULT_TAB: SettingsTab = 'booking';

/**
 * The tabs this viewer gets, and the one /settings opens. In the setup lock
 * (onboarding unfinished, lib/utils/access) only Login and security: the rest
 * is what onboarding asks for (owner, 2026-10-20). A declined mentor keeps
 * their profile to reapply, but not booking rules: nobody can book them.
 * Read by key, never by label.
 */
export function settingsTabs(
  isMentor: boolean,
  access: Access,
): { tabs: SettingsTab[]; first: SettingsTab } {
  if (inSetup(access)) return { tabs: ['security'], first: 'security' };
  if (isMentor && access.state === 'mentorNotApproved')
    return { tabs: MENTOR_TABS.filter((t) => t !== 'booking'), first: 'profile' };
  return isMentor
    ? { tabs: MENTOR_TABS, first: MENTOR_DEFAULT_TAB }
    : { tabs: MENTEE_TABS, first: DEFAULT_TAB };
}
