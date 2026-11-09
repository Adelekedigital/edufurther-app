'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { PageHeader } from '@/components/molecules/PageHeader/PageHeader';
import { useAdminEmails, useEmailValues } from '@/lib/api/data/adminEmails';
import { viewStatus } from '@/lib/api/data/queryStatus';
import { useViewer } from '@/lib/api/data/viewer';
import { ADMIN_PAGES } from '@/lib/copy/admin';
import { EMAIL_TABS } from '@/lib/copy/adminEmails';
import { EmailList } from './EmailList';
import { EmailValues } from './EmailValues';
import styles from './AdminEmailsScreen.module.css';

type Tab = 'list' | 'variables';
const panelId = (t: Tab) => `admin-emails-${t}`;

/**
 * /admin/emails (PRD 28; Admin Emails.dc.html list and variables views). The
 * only place the email hooks are called. `?view=variables` opens Values, as
 * the design's `?view=` does. Both panels stay mounted, so a tab switch keeps
 * the search and filters.
 */
export function AdminEmailsScreen() {
  const viewer = useViewer();
  const adminId = viewer.kind === 'member' && viewer.isAdmin ? viewer.id : null;
  const timeZone = viewer.kind === 'member' ? viewer.timeZone : undefined;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = params.get('view') === 'variables' ? 'variables' : 'list';

  // Both are small: loaded together, so switching tabs never waits.
  const emails = useAdminEmails(adminId);
  const values = useEmailValues(adminId);

  const setTab = (t: string) => {
    const next = new URLSearchParams(params.toString());
    if (t === 'variables') next.set('view', 'variables');
    else next.delete('view');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const items = (['list', 'variables'] as const).map((t) => ({
    value: t,
    label: t === 'list' ? EMAIL_TABS.list : EMAIL_TABS.values,
    panelId: panelId(t),
  }));

  return (
    <div className={styles.screen}>
      <PageHeader {...ADMIN_PAGES.emails} />
      <Tabs label={EMAIL_TABS.label} items={items} value={tab} onChange={setTab} />
      <TabPanel id={panelId('list')} active={tab === 'list'} keepMounted className={styles.panel}>
        <EmailList
          emails={emails.data}
          status={viewStatus(emails)}
          onRetry={() => void emails.refetch()}
          retrying={emails.isFetching}
          timeZone={timeZone}
        />
      </TabPanel>
      <TabPanel
        id={panelId('variables')}
        active={tab === 'variables'}
        keepMounted
        className={styles.panel}
      >
        <EmailValues
          values={values.data}
          status={viewStatus(values)}
          onRetry={() => void values.refetch()}
          retrying={values.isFetching}
        />
      </TabPanel>
    </div>
  );
}
