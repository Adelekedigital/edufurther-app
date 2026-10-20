'use client';

import { notFound, useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Tabs, type TabItem } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { SaveChangesDialog } from '@/components/templates/SaveChangesDialog/SaveChangesDialog';
import { useViewer } from '@/lib/api/data/viewer';
import { SETTINGS_COPY, TAB_LABELS, type SettingsTab } from '@/lib/copy/settings';
import { memberGate, SETTINGS_GATE } from '@/app/_shell/MentorGate';
import { ProfilePanel, type PanelHandle } from './ProfilePanel';
import { DEFAULT_TAB, MENTEE_TABS } from './tabs';
import styles from './SettingsScreen.module.css';

const panelId = (t: SettingsTab) => `settings-${t}`;

/**
 * /settings/[tab] (Mentee Settings.dc.html). Lives in the settings layout, so
 * moving between tabs keeps the screen, and an edit, mounted. Leaving a tab
 * with unsaved changes asks "Save your changes?" first (owner, 2026-10-19).
 * Settings is never locked (PRD "App shell and access"). Mentor Settings is
 * its own PRD: until it ships a mentor gets the 404 they get today.
 */
export function SettingsScreen() {
  const viewer = useViewer();
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const member = viewer.kind === 'member' ? viewer : null;
  const tabs = MENTEE_TABS;
  const known = tabs.find((t) => t === segment);
  const tab = known ?? DEFAULT_TAB;
  // One handle per tab with a form: the switch guard asks the one showing.
  // A tab's panel registers here; tabs with nothing to save leave theirs out.
  const profilePanel = useRef<PanelHandle>(null);
  const panels: Partial<Record<SettingsTab, RefObject<PanelHandle | null>>> = {
    profile: profilePanel,
  };
  const [leaveTo, setLeaveTo] = useState<SettingsTab | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Gone before a save answered (the page moved on): nothing more to do.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Any tab this role doesn't have (a mentor-only one, or one not built yet).
  useEffect(() => {
    if (member && !member.isMentor && segment && !known) router.replace(`/settings/${DEFAULT_TAB}`);
  }, [member, segment, known, router]);

  const gate = memberGate(viewer, `/settings/${segment ?? DEFAULT_TAB}`, SETTINGS_GATE);
  if (gate) return gate;
  if (member?.isMentor) notFound();

  const go = (t: SettingsTab) => router.push(`/settings/${t}`);
  const items: TabItem[] = tabs.map((t) => ({
    value: t,
    label: TAB_LABELS[t],
    panelId: panelId(t),
  }));

  return (
    <div className={styles.screen}>
      <header className={styles.head}>
        <h1 className={styles.title}>{SETTINGS_COPY.title}</h1>
        <p className={styles.sub}>{SETTINGS_COPY.sub}</p>
      </header>
      <div className={styles.tabs}>
        <Tabs
          label={SETTINGS_COPY.tabsLabel}
          items={items}
          value={tab}
          onChange={(v) => {
            const t = v as SettingsTab;
            if (t === tab) return;
            if (panels[tab]?.current?.dirty()) setLeaveTo(t);
            else go(t);
          }}
        />
      </div>

      <TabPanel id={panelId('profile')} active={tab === 'profile'} keepMounted>
        {member ? <ProfilePanel ref={profilePanel} userId={member.id} /> : null}
      </TabPanel>

      {leaveTo && (
        <SaveChangesDialog
          where={TAB_LABELS[tab]}
          saving={leaving}
          onKeep={() => setLeaveTo(null)}
          onDiscard={() => {
            panels[tab]?.current?.discard();
            setLeaveTo(null);
            go(leaveTo);
          }}
          onSave={async () => {
            setLeaving(true);
            const saved = (await panels[tab]?.current?.save()) ?? false;
            if (!alive.current) return;
            setLeaving(false);
            setLeaveTo(null);
            if (saved) go(leaveTo);
          }}
        />
      )}
    </div>
  );
}
