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
  /** Optional: a step without one (the Welcome tour's) shows only its count. */
  badge?: { label: string; tone: TourBadgeTone };
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
    /** The body while Messages is off (MESSAGES_LIVE): it mustn't name a feature they can't open. */
    bodyWithoutMessages?: string;
    rows: { icon: IconName; title: string; meta: string }[];
  };
  steps: TourStep[];
  /** `body` without the replay line: TOUR_COPY.doneReplay follows while the replay is offered. */
  done: { title: string; body: string };
  /** The done card's main button, when it should lead somewhere; "Got it" then sits beside it. */
  doneAction?: { label: string; href: string };
};

/**
 * Who a release is for, from `/me.is_migrated`: `migrated` (carried over
 * from the old app) or `new` (signed up here). Unknown is neither, so nobody
 * gets both. Admins are a future option.
 */
export type TourAudience = 'migrated' | 'new';

/** The words a release may set for itself; any it leaves out are TOUR_COPY's. */
export type TourLabels = {
  /** The welcome's badge. */
  badge: string;
  /** The welcome's title; `first` is '' when there is no first name. */
  welcomeTitle: (first: string) => string;
  /** The account menu and More sheet item that replays it. */
  menuItem: string;
  /** Settings › Login and security's replay row. */
  replayTitle: string;
  replaySub: string;
};

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
   * and More sheet) is offered from then for `replayDays` (default 30), or
   * with no end for `'always'`.
   */
  liveFrom: string;
  replayDays?: number | 'always';
  /** This release's own badge, title, menu item and Settings row (TourLabels). */
  labels?: Partial<TourLabels>;
  roles: Partial<Record<TourRole, TourRoleContent>>;
};

/**
 * The words every tour shares. badge, welcomeTitle, menuItem, replayTitle and
 * replaySub are the defaults a release may replace (`labels`, tourLabels).
 */
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

/** The last step for every role, where the device can install the app; the Welcome tour's has no badge. */
const GET_THE_APP_PLAIN: TourStep = {
  target: 'nav-more',
  install: true,
  title: 'Get the EduFurther app',
  body: 'Add EduFurther to your home screen for one-tap access and notifications about your sessions.',
};
const GET_THE_APP: TourStep = { ...GET_THE_APP_PLAIN, badge: { label: 'New', tone: 'green' } };

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
        bodyWithoutMessages:
          'Your profile and bookings came with you. A few things work differently now.',
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
            title: 'Free sessions every month',
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
          title: 'Free sessions every month',
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

const SESSIONS_BODY =
  'Offer sessions for what you do best, like essay reviews or interview prep. Set the length and how mentees book.';

/**
 * Accounts that signed up here (`/me.is_migrated` false), from launch: where
 * everything is. Replayable from Settings for as long as it is on.
 */
export const WELCOME_2026_11: TourRelease = {
  id: 'welcome:2026-11',
  audience: 'new',
  enabled: true,
  liveFrom: '2026-11-21',
  replayDays: 'always',
  labels: {
    badge: 'Welcome',
    welcomeTitle: (first) => (first ? `Welcome to EduFurther, ${first}` : 'Welcome to EduFurther'),
    menuItem: 'Welcome tour',
    replayTitle: 'Welcome tour',
    replaySub: 'A quick look at where everything is.',
  },
  roles: {
    mentee: {
      welcome: {
        body: 'Here’s where everything is, so you can find a mentor who’s done it and book your first session.',
        rows: [
          {
            icon: 'join',
            title: 'Mentors matched to your plans',
            meta: 'Home shows who fits your goals, and why.',
          },
          {
            icon: 'video_chat',
            title: 'Video sessions in your browser',
            meta: 'No app or download. Join from Bookings.',
          },
          {
            icon: 'toll',
            title: 'Free sessions every month',
            meta: 'Your credits refill each month.',
          },
        ],
      },
      steps: [
        {
          target: 'nav-home',
          title: 'Your matches and your progress',
          body: 'Home shows the mentors who fit your study plans best, and why. As you book sessions, your stats show up here too, like sessions held and hours of guidance.',
        },
        {
          target: 'nav-explore',
          title: 'Find a mentor',
          body: 'Browse every mentor and filter by what you need help with, like scholarships or your visa interview.',
        },
        {
          target: 'nav-bookings',
          title: 'Your sessions, in one place',
          body: 'Join from here when it’s time. Every session gets its own video room in your browser, with no app or download.',
        },
        {
          target: 'nav-messages',
          title: 'Talk to your mentor',
          body: 'Once you book, you can message your mentor and share files, like your CV or an essay draft.',
        },
        {
          target: 'credits-pill',
          title: 'Free sessions every month',
          body: 'Your credits refill each month. Tap here to see what’s left and how credits work.',
        },
        GET_THE_APP_PLAIN,
      ],
      done: {
        title: DONE_TITLE,
        body: 'Find a mentor on Home or Explore and book your first session.',
      },
      doneAction: { label: 'Find a mentor', href: '/explore' },
    },
    mentor: {
      welcome: {
        body: 'Here’s where you manage your hours, sessions and bookings, so mentees can find and book you.',
        rows: [
          {
            icon: 'calendar_month',
            title: 'Your hours live in Calendar',
            meta: 'Weekly availability and blocked dates, in one place.',
          },
          {
            icon: 'event_note',
            title: 'Create your own sessions',
            meta: 'Offer sessions for what you do best.',
          },
          {
            icon: 'video_chat',
            title: 'Video links made for you',
            meta: 'Every booking gets its own video link, created automatically.',
          },
        ],
      },
      steps: [
        {
          target: 'nav-calendar',
          title: 'Your hours live in Calendar',
          body: 'To set or update your weekly availability, or block dates you’re away, come here. Connect Google Calendar so your busy times can’t be booked.',
        },
        {
          target: 'nav-sessions',
          title: 'Create your own sessions',
          body: `${SESSIONS_BODY} Find it under Sessions.`,
          phoneBody: `${SESSIONS_BODY} Find it under More, then Sessions.`,
        },
        {
          target: 'nav-bookings',
          title: 'Your bookings, in one place',
          body: 'See requests and join sessions from here. Every booking gets its own video link, created automatically.',
        },
        {
          target: 'nav-messages',
          title: 'Talk to your mentees',
          body: 'Message mentees who’ve booked you, and share files before the session.',
        },
        GET_THE_APP_PLAIN,
      ],
      done: {
        title: DONE_TITLE,
        body: 'Keep your hours up to date in Calendar so mentees can book you.',
      },
      doneAction: { label: 'Open Calendar', href: '/calendar' },
    },
  },
};

/** Every release, newest last: the first one a viewer qualifies for and hasn't seen shows. */
export const TOUR_RELEASES: readonly TourRelease[] = [MIGRATION_2026_11, WELCOME_2026_11];

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
