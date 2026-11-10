'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Card } from '@/components/atoms/Card/Card';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { InviteWelcome } from '@/components/organisms/InviteWelcome/InviteWelcome';
import { LogoFrame } from '@/components/templates/LogoFrame/LogoFrame';
import { useInviteLink, useInviteLookup } from '@/lib/api/data/invite';
import { SCHOOLS_MIN, useMentorSchools } from '@/lib/api/data/mentorSchools';
import { useViewer } from '@/lib/api/data/viewer';
import { INVITE_LANDING_COPY as COPY } from '@/lib/copy/invite';
import { track } from '@/lib/analytics/track';
import { clearInviteCode, rememberInviteCode } from '@/lib/utils/inviteCode';
import { personCover } from '@/lib/utils/person';
import { useHydrated } from '@/lib/utils/useHydrated';
import { landingView } from './landingView';
import styles from './InviteLanding.module.css';

/**
 * `/invite/{code}` (PRD Invite Landing): a friend who opens an invite link
 * sees who invited them before signing up. The page decides which version
 * (landingView), remembers or drops the code for a guest, and redirects a
 * member. Public: no AppShell, no nav, no Log in link.
 */
export function InviteLanding({ code }: { code: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const viewer = useViewer();
  const guest = viewer.kind === 'guest';
  const mentee = viewer.kind === 'member' && !viewer.isMentor && !viewer.signedUpAsMentor;
  // The lookup is public; a member never needs it. The own code only for a mentee.
  const lookup = useInviteLookup(guest ? code : null);
  const own = useInviteLink(mentee ? viewer.id : null, mentee);
  const view = landingView({
    code,
    viewer,
    lookup,
    ownCode: { data: own.data?.code ?? null, isLoading: own.isLoading, error: own.error },
  });
  // Asked alongside the lookup, and the welcome waits for both: a strip that
  // arrived later would push the buttons down (CLS). Never retried, so a
  // failure doesn't hold the page.
  const schools = useMentorSchools(guest);
  const showsWelcome = (view.kind === 'welcome' || view.kind === 'broken') && !schools.isLoading;

  const remember = 'remember' in view ? view.remember : null;
  useEffect(() => {
    // The latest link wins: a valid one replaces any older code; one that
    // can't be joined leaves none behind.
    if (remember === 'save') {
      if (!rememberInviteCode(code)) clearInviteCode();
    } else if (remember === 'clear') clearInviteCode();
  }, [remember, code]);

  // invite_viewed (PRD 30): once per visit, when the invite resolves to who
  // sent it. Nothing about the invite goes with it, never the code.
  const resolved = view.kind === 'welcome';
  const viewed = useRef(false);
  useEffect(() => {
    if (!resolved || viewed.current) return;
    viewed.current = true;
    track('invite_viewed', {});
  }, [resolved]);

  const to = view.kind === 'redirect' ? view.to : null;
  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);

  // Rendered empty (server and first paint), then filled while the page works
  // out who is visiting: a region inserted with its words is often not read.
  const said =
    hydrated && (view.kind === 'pending' || view.kind === 'redirect')
      ? { text: COPY.opening, id: 1 }
      : null;

  return (
    <LogoFrame variant="landing">
      <main className={styles.main}>
        <LiveRegion message={said} />
        {showsWelcome && (
          <InviteWelcome
            inviter={view.kind === 'welcome' ? { ...view.inviter, tone: personCover(code) } : null}
            schools={schools.data && schools.data.length >= SCHOOLS_MIN ? schools.data : null}
            signUpHref="/signup"
            browseHref="/explore"
          />
        )}
        {view.kind === 'existing' && (
          <Card className={styles.card} padding="none">
            <EmptyState
              illustration="team"
              size={96}
              headingLevel={1}
              fullWidthActions
              variant="card"
              title={COPY.existing.title}
              description={COPY.existing.body}
              actions={
                <ButtonLink href="/home" prefetch={false} variant="primary" size="large" fullWidth>
                  {COPY.existing.action}
                </ButtonLink>
              }
            />
          </Card>
        )}
      </main>
    </LogoFrame>
  );
}
