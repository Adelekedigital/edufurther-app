'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { PageHeader } from '@/components/molecules/PageHeader/PageHeader';
import {
  isAnalyticsTab,
  isFunnelName,
  useAnalyticsBehaviour,
  useAnalyticsCredits,
  useAnalyticsFunnel,
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
import { ALERTS, ANALYTICS_PAGE, ANALYTICS_TABS, FUNNEL_COPY } from '@/lib/copy/adminAnalytics';
import { DEFAULT_WINDOW, windowLabel, type AnalyticsWindow } from '@/lib/utils/analytics';
import { todayIn } from '@/lib/utils/calendar';
import { BehaviourTab, type TabQuery } from './BehaviourTab';
import { CreditsTab, isCreditsEmpty } from './CreditsTab';
import { AlertsButton } from './AlertsButton';
import { DateRangeDialog } from './DateRangeDialog';
import { GrowthTab, isGrowthEmpty } from './GrowthTab';
import { isOverviewEmpty, OverviewTab } from './OverviewTab';
import { isSessionsEmpty, SessionsTab } from './SessionsTab';
import { isSupplyEmpty, SupplyTab } from './SupplyTab';
import { TabState } from './TabState';
import { WindowControls } from './WindowControls';
import styles from './AdminAnalyticsScreen.module.css';

const panelId = (t: AnalyticsTab) => `admin-analytics-${t}`;

/** A query as a tab reads it: its state, data, why it failed, and a retry. */
const tabQuery = <T,>(q: {
  data: T | undefined;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  refetch: () => unknown;
}): TabQuery<T> => ({
  status: viewStatus(q),
  data: q.data,
  error: q.error,
  onRetry: () => void q.refetch(),
  retrying: q.isFetching,
});

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

  // Only the open tab asks; Behaviour reads the alerts from Overview.
  const on = (...tabs: AnalyticsTab[]) => (tabs.includes(tab) ? adminId : null);
  const overview = useAnalyticsOverview(on('overview', 'funnels'), win, compare);
  const sessions = useAnalyticsSessions(on('sessions'), win, compare);
  const supply = useAnalyticsSupply(on('supply'), win, compare);
  const credits = useAnalyticsCredits(on('credits'), win, compare);
  const growth = useAnalyticsGrowth(on('growth'), win, compare);
  const funnelQ = useAnalyticsFunnel(on('funnels'), funnel, by, win);
  const events = useAnalyticsBehaviour(on('funnels'), win);
  const current = { overview, sessions, supply, credits, growth, funnels: overview }[tab];
  // The last alerts known stay up while another tab or window loads, so the
  // count doesn't blink, or the open list close, on every move.
  const fresh = current.data?.alerts;
  const [lastAlerts, setLastAlerts] = useState<AnalyticsAlert[]>([]);
  if (fresh && fresh !== lastAlerts) setLastAlerts(fresh);
  const alerts = fresh ?? lastAlerts;
  // The count is quiet beside the title, so a new set of alerts is said once.
  const alertKeys = alerts.map((a) => a.key).join(',');
  const [said, setSaid] = useState({ keys: '', n: 0 });
  if (alertKeys !== said.keys) setSaid({ keys: alertKeys, n: said.n + 1 });
  const alertNews = alertKeys
    ? { text: `${ALERTS.count(alerts.length)} firing`, id: said.n }
    : null;

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
        titleAside={<AlertsButton alerts={alerts} onOpen={go} />}
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
      <LiveRegion message={alertNews} />
      <Tabs
        label={ANALYTICS_PAGE.tabsLabel}
        items={items}
        value={tab}
        onChange={(t) => go({ tab: t as AnalyticsTab })}
      />
      <TabPanel id={panelId(tab)} active className={styles.panel}>
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
        {tab === 'funnels' && (
          <BehaviourTab
            funnel={funnel}
            by={by}
            // Another funnel starts from its whole audience.
            onFunnel={(f) => go({ tab: 'funnels', funnel: f })}
            onBy={(b) => go({ tab: 'funnels', funnel, by: b })}
            funnelQuery={tabQuery(funnelQ)}
            eventsQuery={tabQuery(events)}
          />
        )}
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
