import { redirect } from 'next/navigation';
import { TAB_LABELS, type SettingsTab } from '@/lib/copy/settings';

/**
 * /settings has no page of its own (Settings.dc.html is a role redirect).
 * `?tab=` names a tab: go there. Otherwise the screen (in the layout) opens
 * the role's first tab once the role is known: Booking rules for a mentor,
 * Profile for a mentee. The server can't know the role, so it doesn't guess.
 */
export default async function SettingsIndex({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab: raw } = await searchParams;
  const tab = Array.isArray(raw) ? raw[0] : raw; // ?tab=a&tab=b: the first one
  const asked =
    typeof tab === 'string' && Object.hasOwn(TAB_LABELS, tab) ? (tab as SettingsTab) : null;
  if (asked) redirect(`/settings/${asked}`);
  return null;
}
