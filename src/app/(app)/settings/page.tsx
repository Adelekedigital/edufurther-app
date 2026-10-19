import { redirect } from 'next/navigation';
import { TAB_LABELS, type SettingsTab } from '@/lib/copy/settings';

/**
 * /settings has no page of its own (Settings.dc.html is a role redirect):
 * the first tab, or the one `?tab=` names. The screen sends a tab this role
 * doesn't have to its first one.
 */
export default async function SettingsIndex({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const asked =
    typeof tab === 'string' && Object.hasOwn(TAB_LABELS, tab) ? (tab as SettingsTab) : null;
  redirect(`/settings/${asked ?? 'profile'}`);
}
