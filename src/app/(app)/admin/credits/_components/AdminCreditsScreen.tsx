'use client';

import { useEffect, useState } from 'react';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { PageHeader } from '@/components/molecules/PageHeader/PageHeader';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { SideDrawer } from '@/components/templates/SideDrawer/SideDrawer';
import {
  useAddCredits,
  useAdminMentees,
  useCreditLog,
  useCreditRules,
  useMenteeCredits,
} from '@/lib/api/data/adminCredits';
import { useViewer } from '@/lib/api/data/viewer';
import { ADMIN_ACTION_FAILED, ADMIN_PAGES } from '@/lib/copy/admin';
import {
  addedToast,
  CREDITS_TABS,
  FIND_COPY,
  PANEL_COPY,
  type CreditLogType,
} from '@/lib/copy/adminCredits';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { AddCreditsConfirm } from './AddCreditsConfirm';
import { CreditLog } from './CreditLog';
import { CreditRules } from './CreditRules';
import { FindMenteeCard } from './FindMenteeCard';
import { MenteeHeader, PanelBody } from './MenteeCreditsPanel';
import styles from './AdminCreditsScreen.module.css';

type Tab = 'add' | 'log' | 'rules';
const TOAST_MS = 5000;
const panelId = (t: Tab) => `admin-credits-${t}`;

const statusOf = (q: { isLoading: boolean; isError: boolean }) =>
  q.isError ? 'error' : q.isLoading ? 'loading' : 'ready';

/**
 * /admin/credits (Admin PRD "Credits page"; Admin.dc.html creditLayout lookup).
 * The only place the credit hooks are called. Changing tab clears the pick.
 */
export function AdminCreditsScreen() {
  const viewer = useViewer();
  const adminId = viewer.kind === 'member' && viewer.isAdmin ? viewer.id : null;
  const timeZone = viewer.kind === 'member' ? viewer.timeZone : undefined;
  const isPhone = useMediaQuery('(max-width: 767px)');

  const [tab, setTab] = useState<Tab>('add');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [logType, setLogType] = useState<CreditLogType>('all');
  const [toast, setToast] = useState<{ text: string; ok: boolean; stamp: number } | null>(null);

  const found = useAdminMentees(tab === 'add' ? adminId : null, q);
  const credits = useMenteeCredits(adminId, picked?.id ?? null);
  const log = useCreditLog(tab === 'log' ? adminId : null, logType);
  const rules = useCreditRules(tab === 'rules' ? adminId : null);
  const add = useAddCredits();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const pick = (id: string, name: string) => {
    setPicked({ id, name });
    setAmount(1);
    setReason('');
  };
  const changeTab = (t: string) => {
    setTab(t as Tab);
    setPicked(null);
  };

  const mentee = credits.mentee;
  const confirm = () => {
    if (!mentee) return;
    const n = amount;
    add.mutate(
      { menteeId: mentee.id, quantity: n, note: reason || null },
      {
        onSuccess: () => {
          setToast({ text: addedToast(n, mentee.name), ok: true, stamp: Date.now() });
          setAmount(1);
          setReason('');
        },
        // Nothing changed: the form keeps what was chosen, for another go.
        onError: () => setToast({ text: ADMIN_ACTION_FAILED, ok: false, stamp: Date.now() }),
        onSettled: () => setConfirming(false),
      },
    );
  };

  const name = mentee?.name ?? picked?.name ?? '';
  const body = picked && (
    <PanelBody
      mentee={mentee}
      history={credits.history}
      status={statusOf(credits)}
      onRetry={credits.retry}
      timeZone={timeZone}
      amount={amount}
      onAmount={setAmount}
      reason={reason}
      onReason={setReason}
      onAdd={() => setConfirming(true)}
      more={credits}
    />
  );
  // Beside the find card on desktop; a drawer from the log, full screen on phones.
  const inline = !!picked && tab === 'add' && !isPhone;

  const items = (['add', 'log', 'rules'] as const).map((t) => ({
    value: t,
    label: CREDITS_TABS[t],
    panelId: panelId(t),
  }));

  return (
    <>
      <PageHeader {...ADMIN_PAGES.credits} />
      <div className={styles.tabs}>
        <Tabs label={CREDITS_TABS.label} items={items} value={tab} onChange={changeTab} />
      </div>

      <TabPanel id={panelId('add')} active={tab === 'add'} className={styles.body}>
        <FindMenteeCard
          query={q}
          onQuery={setQ}
          mentees={found.mentees}
          term={found.term}
          status={statusOf(found)}
          onRetry={found.retry}
          pickedId={picked?.id ?? null}
          onPick={(m) => pick(m.id, m.name)}
          narrow={inline}
        />
        {inline ? (
          <section className={styles.panel} aria-label={PANEL_COPY.label(name)}>
            <MenteeHeader name={name} mentee={mentee} />
            {body}
          </section>
        ) : (
          !isPhone && <div className={styles.pickHint}>{FIND_COPY.pick}</div>
        )}
      </TabPanel>

      <TabPanel id={panelId('log')} active={tab === 'log'} className={styles.body}>
        <CreditLog
          type={logType}
          onType={setLogType}
          entries={log.entries}
          status={statusOf(log)}
          onRetry={log.retry}
          timeZone={timeZone}
          onOpen={(e) => pick(e.menteeId, e.menteeName)}
          more={log}
        />
      </TabPanel>

      {/* Nothing in it takes focus, so the panel itself does (WAI-ARIA tabs). */}
      <TabPanel id={panelId('rules')} active={tab === 'rules'} className={styles.body} tabIndex={0}>
        <CreditRules rules={rules.rules} status={statusOf(rules)} onRetry={rules.retry} />
      </TabPanel>

      <SideDrawer
        open={!!picked && !inline}
        title={PANEL_COPY.label(name)}
        onClose={() => setPicked(null)}
        header={<MenteeHeader name={name} mentee={mentee} />}
      >
        {body}
      </SideDrawer>

      {confirming && mentee && (
        <AddCreditsConfirm
          mentee={mentee}
          amount={amount}
          pending={add.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={confirm}
        />
      )}
      <Snackbar
        message={toast?.text ?? null}
        stamp={toast?.stamp}
        tone={toast ? (toast.ok ? 'success' : 'error') : undefined}
      />
    </>
  );
}
