'use client';

import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Tabs, type TabItem } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { SaveChangesDialog } from '@/components/templates/SaveChangesDialog/SaveChangesDialog';
import { useViewer } from '@/lib/api/data/viewer';
import { MENTOR_SETTINGS_SUB } from '@/lib/copy/mentorSettings';
import { SETTINGS_COPY, TAB_LABELS, type SettingsTab } from '@/lib/copy/settings';
import { memberGate, SETTINGS_GATE } from '@/app/_shell/MentorGate';
import { skipNextRouteFocus } from '@/app/_shell/RouteFocusManager';
import { BookingPanel } from './BookingPanel';
import { EducationPanel } from './EducationPanel';
import { ExpertisePanel } from './ExpertisePanel';
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
  // Submitted and awaiting a decision: what's reviewed holds still (decision 273).
  const inReview = member?.mentorStage === 'pending';
  const tabs = mentor ? MENTOR_TABS : MENTEE_TABS;
  const first = mentor ? MENTOR_DEFAULT_TAB : DEFAULT_TAB;
  const known = tabs.find((t) => t === segment);
  const tab = known ?? first;
  // One handle per tab with a form: the switch guard asks the one showing.
  // A tab's panel registers here; tabs with nothing to save leave theirs out.
  const profilePanel = useRef<PanelHandle>(null);
  const bookingPanel = useRef<PanelHandle>(null);
  const goalsPanel = useRef<PanelHandle>(null);
  const expertisePanel = useRef<PanelHandle>(null);
  const panels: Partial<Record<SettingsTab, RefObject<PanelHandle | null>>> = {
    profile: profilePanel,
    booking: bookingPanel,
    goals: goalsPanel,
    expertise: expertisePanel,
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

  // /settings itself, or a tab this role doesn't have (the other role's, or
  // one not built yet): the role's first tab, once the role is known.
  useEffect(() => {
    if (member && !known) {
      // Only /settings itself is a redirect as the page loads: its heading
      // doesn't take focus. A link to another role's tab is a navigation.
      if (!segment) skipNextRouteFocus(`/settings/${first}`);
      router.replace(`/settings/${first}`);
    }
  }, [member, known, first, router, segment]);

  const gate = memberGate(viewer, `/settings/${segment ?? first}`, SETTINGS_GATE);
  if (gate) return gate;

  // The role isn't known yet: nothing role-specific (subline, tabs, panel),
  // so a mentor never sees the mentee's tabs flash first (owner, 2026-10-20).
  if (viewer.kind === 'loading')
    return (
      <div className={styles.screen}>
        {/* Said once, beside the skeleton: the heading stays outside the live region. */}
        <p role="status" className="sr-only">
          {SETTINGS_COPY.loading}
        </p>
        <header className={styles.head} aria-busy="true">
          <h1 className={styles.title}>{SETTINGS_COPY.title}</h1>
          <Skeleton width="320px" height="18px" className={styles.skeletonSub} />
        </header>
        <div className={styles.skeletonRow}>
          <div className={styles.skeletonTabs} aria-hidden>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="88px" height="20px" />
            ))}
          </div>
        </div>
        <div className={styles.skeletonCard} aria-hidden>
          <Skeleton width="30%" height="24px" />
          <Skeleton width="70%" height="18px" />
          <Skeleton height="40px" radius="md" />
          <Skeleton height="40px" radius="md" />
        </div>
      </div>
    );

  // A tab is its own URL, but choosing one keeps focus on the tab, as on every
  // other tab row (WAI-ARIA tabs): no move to the h1 as for a new page.
  const go = (t: SettingsTab) => {
    skipNextRouteFocus(`/settings/${t}`);
    router.push(`/settings/${t}`);
  };
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

      {mentor ? (
        <>
          <TabPanel id={panelId('booking')} active={tab === 'booking'} keepMounted>
            {member ? <BookingPanel ref={bookingPanel} userId={member.id} /> : null}
          </TabPanel>
          <TabPanel id={panelId('profile')} active={tab === 'profile'} keepMounted>
            {member ? (
              <MentorProfilePanel ref={profilePanel} userId={member.id} frozen={inReview} />
            ) : null}
          </TabPanel>
          <TabPanel id={panelId('expertise')} active={tab === 'expertise'} keepMounted>
            {member ? (
              <ExpertisePanel ref={expertisePanel} userId={member.id} frozen={inReview} />
            ) : null}
          </TabPanel>
          {/* Nothing to edit here: only while shown, as on the mentee's. */}
          <TabPanel id={panelId('security')} active={tab === 'security'}>
            {member ? <SecurityPanel userId={member.id} role="mentor" /> : null}
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
