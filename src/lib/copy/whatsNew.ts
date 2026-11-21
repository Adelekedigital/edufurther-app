import type { IconName } from '@/components/atoms/Icon/iconNames';
import type { TourReleaseId, TourRole } from '@/lib/analytics/events';
import { INSTALL_COPY } from './install';

const S = INSTALL_COPY.steps;

export type { TourReleaseId, TourRole };

/**
 * "What's new" tours (ADR 0014): one entry per release, keyed by its id, which
 * is also the key the backend keeps in `/me.seen_items` once the viewer has
 * seen it. A future release is a new entry here and a flag, never new code
 * (project-conventions, What's new tours). Never rename a live id: everyone
 * who has seen it would see it again.
 */

/**
 * Where a step points: a `data-tour` id on the shell (AppShell nav items,
 * CreditsPill). Found by id, never by position.
 */
export type TourTarget =
  | 'nav-home'
  | 'nav-explore'
  | 'nav-bookings'
  | 'nav-calendar'
  | 'nav-sessions'
  | 'nav-messages'
  | 'nav-settings'
  | 'nav-more'
  | 'credits-pill';

/** The badge's tone: blue Improved, green New, orange Changed / Check this. */
export type TourBadgeTone = 'blue' | 'green' | 'orange';

export type TourStep = {
  target: TourTarget;
  badge: { label: string; tone: TourBadgeTone };
  title: string;
  body: string;
  /** Phones say it differently (e.g. where in More it lives). */
  phoneBody?: string;
  /**
   * Required: with its target missing, the whole tour waits. Optional (the
   * default): the step is dropped and the count reads "of N" without it.
   */
  required?: boolean;
  /**
   * "Get the app": shown only where this device can install the app (not
   * already installed); its buttons are Install app and Finish. With no target
   * on screen (desktop), the card is centred.
   */
  install?: boolean;
};

export type TourRoleContent = {
  welcome: {
    body: string;
    rows: { icon: IconName; title: string; meta: string }[];
  };
  steps: TourStep[];
  /** `body` without the replay line: TOUR_COPY.doneReplay follows while the replay is offered. */
  done: { title: string; body: string };
  /** The done card's main button, when it should lead somewhere; "Got it" then sits beside it. */
  doneAction?: { label: string; href: string };
};

/** Who a release is for. Only `migrated` today; admins and new sign-ups are future options. */
export type TourAudience = 'migrated';

export type TourRelease = {
  /** The seen key: ^[a-z0-9][a-z0-9:._-]{0,79}$ (the backend refuses anything else). */
  id: TourReleaseId;
  audience: TourAudience;
  /**
   * This release's own switch: false turns it off (no tour, no replay) and
   * leaves the others alone. Every release also needs the global
   * NEXT_PUBLIC_WHATS_NEW_ENABLED (lib/config/whatsNew, `activeReleases`).
   */
  enabled: boolean;
  /**
   * The release day (ISO date, UTC). "Replay tour" (Settings, the account menu
   * and More sheet) is offered from then for `replayDays` (default 30).
   */
  liveFrom: string;
  replayDays?: number;
  roles: Partial<Record<TourRole, TourRoleContent>>;
};

/** The words every tour shares. */
export const TOUR_COPY = {
  badge: 'New platform',
  welcomeTitle: (first: string) =>
    first ? `Welcome to the new EduFurther, ${first}` : 'Welcome to the new EduFurther',
  showMe: 'Show me around',
  notNow: 'Not now',
  hint: 'Takes about a minute.',
  /** After the hint and the done card's body, only while the replay is offered (replayDays). */
  welcomeReplay: 'You can replay it from Settings.',
  doneReplay: 'You can replay this tour from Settings.',
  stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
  skip: 'Skip',
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
  gotIt: 'Got it',
  /** Read with the step, so a screen reader hears what is highlighted. */
  pointsAt: (label: string) => `Highlighted: ${label}.`,
  replayTitle: 'What’s new',
  replaySub: 'A quick look at what changed on EduFurther.',
  replay: 'Replay tour',
  /** The account menu and More sheet item. */
  menuItem: 'What’s new',
  installApp: 'Install app',
  /** iPhone Safari has no prompt: the install sheet's steps, in one line. */
  iosInstallHint: `${S.shareBefore} ${S.share} ${S.shareAfter}, then ${S.choose.toLowerCase()} ${S.addToHome}.`,
} as const;

const DONE_TITLE = 'You’re all set';

/** The last step for every role, where the device can install the app. */
const GET_THE_APP: TourStep = {
  target: 'nav-more',
  install: true,
  badge: { label: 'New', tone: 'green' },
  title: 'Get the EduFurther app',
  body: 'Add EduFurther to your home screen for one-tap access and notifications about your sessions.',
};

/** Accounts carried over from the old app (`/me.is_migrated`), launch 23 Nov 2026. */
export const MIGRATION_2026_11: TourRelease = {
  id: 'whats-new:2026-11-migration',
  audience: 'migrated',
  enabled: true,
  // A day early for the staging check; production waits on NEXT_PUBLIC_WHATS_NEW_ENABLED.
  liveFrom: '2026-11-21',
  // The replay window still ends on 23 Dec.
  replayDays: 32,
  roles: {
    mentee: {
      welcome: {
        body: 'Your profile, bookings and any messages you had came with you. A few things work differently now.',
        rows: [
          {
            icon: 'join',
            title: 'Matches and progress on Home',
            meta: 'Mentors who fit your plans, and your session stats.',
          },
          {
            icon: 'video_chat',
            title: 'Video sessions in your browser',
            meta: 'No app or download. Join from Bookings.',
          },
          {
            icon: 'toll',
            title: '3 free sessions every month',
            meta: 'Your credits refill each month.',
          },
        ],
      },
      steps: [
        {
          target: 'nav-home',
          badge: { label: 'Improved', tone: 'blue' },
          title: 'Your matches and your progress',
          body: 'Home shows the mentors who fit your study plans best, and why. Your stats, like sessions held and hours of guidance, are here too, so you can track your progress.',
        },
        {
          target: 'nav-bookings',
          badge: { label: 'New', tone: 'green' },
          title: 'Join sessions from Bookings',
          body: 'Every session gets its own video room. Join right from your browser, with no app or download.',
        },
        {
          target: 'credits-pill',
          badge: { label: 'Changed', tone: 'orange' },
          title: '3 free sessions every month',
          body: 'Your credits refill each month. Tap here to see what’s left and how credits work.',
        },
        GET_THE_APP,
      ],
      done: {
        title: DONE_TITLE,
        body: 'Book your next session from Home or Explore.',
      },
    },
    mentor: {
      welcome: {
        body: 'Your profile and bookings came with you. A few things work differently now, so take a minute to check your weekly hours.',
        rows: [
          {
            icon: 'calendar_month',
            title: 'Your hours live in Calendar',
            meta: 'Weekly hours and days off, in one place.',
          },
          {
            icon: 'event_note',
            title: 'Create your own sessions',
            meta: 'Offer sessions for what you do best.',
          },
          {
            icon: 'video_chat',
            title: 'No more manual meeting links',
            meta: 'Every booking gets its own video link, created automatically.',
          },
        ],
      },
      steps: [
        {
          target: 'nav-calendar',
          badge: { label: 'Check this', tone: 'orange' },
          title: 'Check your weekly hours',
          body: 'Set your weekly hours and days off in Calendar. Connect Google Calendar so your busy times can’t be booked.',
        },
        {
          target: 'nav-sessions',
          badge: { label: 'New', tone: 'green' },
          title: 'Create your own sessions',
          body: 'Offer sessions for what you do best, like essay reviews or interview prep. Set the length and how mentees book. Find it under Sessions.',
          phoneBody:
            'Offer sessions for what you do best, like essay reviews or interview prep. Set the length and how mentees book. Find it under More, then Sessions.',
        },
        {
          target: 'nav-bookings',
          badge: { label: 'Changed', tone: 'orange' },
          title: 'No more manual meeting links',
          body: 'Every booking gets its own video link, created automatically. Join from Bookings.',
        },
        GET_THE_APP,
      ],
      done: {
        title: DONE_TITLE,
        body: 'Check your hours in Calendar so mentees can book you.',
      },
      doneAction: { label: 'Check my hours', href: '/calendar' },
    },
  },
};

/** Every release, newest last: the first one a viewer qualifies for and hasn't seen shows. */
export const TOUR_RELEASES: readonly TourRelease[] = [MIGRATION_2026_11];

/** What each target is called when read out ("Highlighted: Bookings."). */
export const TARGET_LABELS: Record<TourTarget, string> = {
  'nav-home': 'Home',
  'nav-explore': 'Explore',
  'nav-bookings': 'Bookings',
  'nav-calendar': 'Calendar',
  'nav-sessions': 'Sessions',
  'nav-messages': 'Messages',
  'nav-settings': 'Settings',
  'nav-more': 'More',
  'credits-pill': 'Your credits',
};
