'use client';

import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Tabs, type TabItem } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { SaveChangesDialog } from '@/components/templates/SaveChangesDialog/SaveChangesDialog';
import { useViewer } from '@/lib/api/data/viewer';
import { MENTOR_SETTINGS_SUB } from '@/lib/copy/mentorSettings';
import { SETTINGS_COPY, TAB_LABELS, type SettingsTab } from '@/lib/copy/settings';
import { memberGate, SETTINGS_GATE } from '@/app/_shell/MentorGate';
import { BookingPanel } from './BookingPanel';
import { EducationPanel } from './EducationPanel';
import { GoalsPanel } from './GoalsPanel';
import { MentorProfilePanel } from './MentorProfilePanel';
import { ProfilePanel, type PanelHandle } from './ProfilePanel';
import { SecurityPanel } from './SecurityPanel';
import { DEFAULT_TAB, MENTEE_TABS, MENTOR_DEFAULT_TAB, MENTOR_TABS } from './tabs';
import styles from './SettingsScreen.module.css';

const panelId = (t: SettingsTab) => `settings-${t}`;

/**
 * /settings/[tab] (Mentee Settings.dc.html). Lives in the settings layout, so
 * moving between tabs keeps the screen, and an edit, mounted. Leaving a tab
 * with unsaved changes asks "Save your changes?" first (owner, 2026-10-19).
 * Settings is never locked (PRD "App shell and access"). A mentor gets the
 * mentor tabs (Mentor Settings.dc.html), as each one ships.
 */
export function SettingsScreen() {
  const viewer = useViewer();
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const member = viewer.kind === 'member' ? viewer : null;
  const mentor = !!member?.isMentor;
  const tabs = mentor ? MENTOR_TABS : MENTEE_TABS;
  const first = mentor ? MENTOR_DEFAULT_TAB : DEFAULT_TAB;
  const known = tabs.find((t) => t === segment);
  const tab = known ?? first;
  // One handle per tab with a form: the switch guard asks the one showing.
  // A tab's panel registers here; tabs with nothing to save leave theirs out.
  const profilePanel = useRef<PanelHandle>(null);
  const bookingPanel = useRef<PanelHandle>(null);
  const goalsPanel = useRef<PanelHandle>(null);
  const panels: Partial<Record<SettingsTab, RefObject<PanelHandle | null>>> = {
    profile: profilePanel,
    booking: bookingPanel,
    goals: goalsPanel,
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

  // Any tab this role doesn't have (the other role's, or one not built yet).
  useEffect(() => {
    if (member && segment && !known) router.replace(`/settings/${first}`);
  }, [member, segment, known, first, router]);

  const gate = memberGate(viewer, `/settings/${segment ?? first}`, SETTINGS_GATE);
  if (gate) return gate;

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
        <p className={styles.sub}>{mentor ? MENTOR_SETTINGS_SUB : SETTINGS_COPY.sub}</p>
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

      {mentor ? (
        <>
          <TabPanel id={panelId('booking')} active={tab === 'booking'} keepMounted>
            {member ? <BookingPanel ref={bookingPanel} userId={member.id} /> : null}
          </TabPanel>
          <TabPanel id={panelId('profile')} active={tab === 'profile'} keepMounted>
            {member ? <MentorProfilePanel ref={profilePanel} userId={member.id} /> : null}
          </TabPanel>
        </>
      ) : (
        <>
          <TabPanel id={panelId('profile')} active={tab === 'profile'} keepMounted>
            {member ? <ProfilePanel ref={profilePanel} userId={member.id} /> : null}
          </TabPanel>
          <TabPanel id={panelId('goals')} active={tab === 'goals'} keepMounted>
            {member ? <GoalsPanel ref={goalsPanel} userId={member.id} /> : null}
          </TabPanel>
          {/* Every change saves in its modal: nothing to keep while hidden. */}
          <TabPanel id={panelId('education')} active={tab === 'education'}>
            {member ? <EducationPanel userId={member.id} /> : null}
          </TabPanel>
          {/* Nothing to edit here (the confirm's word is meant to start empty): only while shown. */}
          <TabPanel id={panelId('security')} active={tab === 'security'}>
            {member ? <SecurityPanel userId={member.id} /> : null}
          </TabPanel>
        </>
      )}

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
