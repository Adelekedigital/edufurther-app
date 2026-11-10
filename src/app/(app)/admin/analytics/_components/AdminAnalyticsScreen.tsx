'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { Notice } from '@/components/molecules/Notice/Notice';
import { PageHeader } from '@/components/molecules/PageHeader/PageHeader';
import {
  isAnalyticsTab,
  isFunnelName,
  useAnalyticsCredits,
  useAnalyticsGrowth,
  useAnalyticsOverview,
  useAnalyticsSessions,
  useAnalyticsSupply,
  type AnalyticsAlert,
  type AnalyticsTab,
  type FunnelName,
} from '@/lib/api/data/adminAnalytics';
import { viewStatus } from '@/lib/api/data/queryStatus';
import { useViewer } from '@/lib/api/data/viewer';
import {
  alertLinkLabel,
  ANALYTICS_PAGE,
  ANALYTICS_TABS,
  FUNNEL_COPY,
} from '@/lib/copy/adminAnalytics';
import { DEFAULT_WINDOW, windowLabel, type AnalyticsWindow } from '@/lib/utils/analytics';
import { todayIn } from '@/lib/utils/calendar';
import { CreditsTab, isCreditsEmpty } from './CreditsTab';
import { DateRangeDialog } from './DateRangeDialog';
import { GrowthTab, isGrowthEmpty } from './GrowthTab';
import { isOverviewEmpty, OverviewTab } from './OverviewTab';
import { isSessionsEmpty, SessionsTab } from './SessionsTab';
import { isSupplyEmpty, SupplyTab } from './SupplyTab';
import { TabState } from './TabState';
import { WindowControls } from './WindowControls';
import styles from './AdminAnalyticsScreen.module.css';

const panelId = (t: AnalyticsTab) => `admin-analytics-${t}`;

/** A database tab: its four states around its content. */
function section<D>(
  q: { data: D | undefined; isError: boolean; isFetching: boolean; refetch: () => unknown },
  isEmpty: (d: D) => boolean,
  render: (d: D) => ReactNode,
) {
  return (
    <TabState
      status={viewStatus(q)}
      empty={q.data !== undefined && isEmpty(q.data)}
      onRetry={() => void q.refetch()}
      retrying={q.isFetching}
    >
      {() => render(q.data as D)}
    </TabState>
  );
}

/**
 * /admin/analytics (PRD 31; Admin Analytics.dc.html, direction 1a). The only
 * place the analytics hooks are called; only the open tab loads. The tab, the
 * funnel and its breakdown live in the URL (`?tab=`, `funnel`, `by`), so an
 * alert's link opens the view that explains it; the window and Compare are
 * this visit's.
 */
export function AdminAnalyticsScreen() {
  const viewer = useViewer();
  const adminId = viewer.kind === 'member' && viewer.isAdmin ? viewer.id : null;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get('tab');
  const tab: AnalyticsTab = isAnalyticsTab(raw) ? raw : 'overview';
  const rawFunnel = params.get('funnel');
  const funnel: FunnelName = isFunnelName(rawFunnel) ? rawFunnel : 'signup';
  // A breakdown the funnel doesn't offer is never asked for: it reads as the whole audience.
  const rawBy = params.get('by');
  const by = FUNNEL_COPY[funnel].by.some(([v]) => v === rawBy) ? rawBy! : 'all';

  const [win, setWin] = useState<AnalyticsWindow>(DEFAULT_WINDOW);
  const [compare, setCompare] = useState(true);
  const [picking, setPicking] = useState(false);
  const today = todayIn('UTC');

  // Only the open tab asks; Behavior reads the alerts from Overview.
  const on = (...tabs: AnalyticsTab[]) => (tabs.includes(tab) ? adminId : null);
  const overview = useAnalyticsOverview(on('overview', 'funnels'), win, compare);
  const sessions = useAnalyticsSessions(on('sessions'), win, compare);
  const supply = useAnalyticsSupply(on('supply'), win, compare);
  const credits = useAnalyticsCredits(on('credits'), win, compare);
  const growth = useAnalyticsGrowth(on('growth'), win, compare);
  const current = { overview, sessions, supply, credits, growth, funnels: overview }[tab];
  // The last alerts known stay up while another tab or window loads, so a
  // banner isn't announced again, or its focused link lost, on every move.
  const fresh = current.data?.alerts;
  const [lastAlerts, setLastAlerts] = useState<AnalyticsAlert[]>([]);
  if (fresh && fresh !== lastAlerts) setLastAlerts(fresh);
  const alerts = fresh ?? lastAlerts;

  const go = (next: { tab: AnalyticsTab; funnel?: FunnelName; by?: string }) => {
    const q = new URLSearchParams();
    if (next.tab !== 'overview') q.set('tab', next.tab);
    if (next.tab === 'funnels') {
      if (next.funnel && next.funnel !== 'signup') q.set('funnel', next.funnel);
      if (next.by && next.by !== 'all') q.set('by', next.by);
    }
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const items = ANALYTICS_TABS.map((t) => ({ ...t, panelId: panelId(t.value) }));

  return (
    <div className={styles.screen}>
      <PageHeader
        title={ANALYTICS_PAGE.title}
        subtitle={ANALYTICS_PAGE.subtitle}
        actions={
          <WindowControls
            window={win}
            compare={compare}
            onWindow={setWin}
            onCustom={() => setPicking(true)}
            onCompare={setCompare}
          />
        }
      />
      <Tabs
        label={ANALYTICS_PAGE.tabsLabel}
        items={items}
        value={tab}
        onChange={(t) => go({ tab: t as AnalyticsTab })}
      />
      <TabPanel id={panelId(tab)} active className={styles.panel}>
        {/* In the panel, not above the tabs: it arrives with the tab's data, so
            there it lands with the content instead of pushing the page down (CLS). */}
        {alerts.map((a) => (
          <Notice
            key={a.key}
            tone="alert"
            icon="error"
            title={`${a.title}:`}
            action={
              a.link && (
                <button type="button" className={styles.alertLink} onClick={() => go(a.link!)}>
                  {alertLinkLabel(a.link)}
                </button>
              )
            }
          >
            {a.body}
          </Notice>
        ))}
        {tab === 'overview' &&
          section(overview, isOverviewEmpty, (d) => (
            <OverviewTab
              data={d}
              compare={compare}
              windowLabel={windowLabel(win)}
              onOpen={(t) => go({ tab: t })}
            />
          ))}
        {tab === 'sessions' &&
          section(sessions, isSessionsEmpty, (d) => <SessionsTab data={d} compare={compare} />)}
        {tab === 'supply' && section(supply, isSupplyEmpty, (d) => <SupplyTab data={d} />)}
        {tab === 'credits' && section(credits, isCreditsEmpty, (d) => <CreditsTab data={d} />)}
        {tab === 'growth' &&
          section(growth, isGrowthEmpty, (d) => <GrowthTab data={d} compare={compare} />)}
      </TabPanel>
      <p className={styles.footer}>{ANALYTICS_PAGE.footer}</p>
      {picking && (
        <DateRangeDialog
          today={today}
          initial={win.kind === 'custom' ? { from: win.from, to: win.to } : null}
          onClose={() => setPicking(false)}
          onApply={(r) => {
            setWin({ kind: 'custom', ...r });
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
