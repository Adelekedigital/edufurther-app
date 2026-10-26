/**
 * Mentee Home's new-mentee words (Mentee Dashboard v2.dc.html, newHome
 * nextStep; PRD "Mentee Home", founder changes of 25 Oct). Reviewed with
 * edufurther-ux-writer: sentence case, no em dashes.
 */

export const NEW_SUBLINE = {
  incomplete: 'Let’s set you up for a great first session.',
  ready: 'You’re all set. Let’s book your first session.',
  requested: 'Your first session is requested.',
  booked: 'Your first session is booked.',
  firstDone: 'Nice work on your first session. Here’s what’s next.',
} as const;

/** "Requested with Mariam · Thu, Oct 15, 6:00 pm", or "Booked with …" once confirmed. */
export const withLine = (confirmed: boolean, first: string, when: string) =>
  `${confirmed ? 'Booked' : 'Requested'} with ${first} · ${when}`;

export const INVITE_COPY = {
  title: 'Get 3 free sessions every month',
  body: 'Invite a friend who’s on this journey with you. Once they join and set up their profile, and you’ve attended your first session, you get 3 free sessions every month.',
  friendJoined: 'Your friend joined. Attend your first session to get 3 free sessions every month.',
  unlocked:
    'Think of someone you’d love to walk this path with. Give them a free first session with a mentor who’s been where they want to go.',
} as const;

export const NEXT_STEP = {
  incomplete: {
    kicker: 'Your next step',
    kickerLeft: 'One step left',
    title: 'Finish your profile for better matches',
    body: 'Mentors read your profile before a session, so they can come prepared for your goal.',
    meter: (n: number, next: string | null) =>
      next ? `${n} of 4 done · Next: ${next}` : `${n} of 4 done`,
    action: 'Complete profile',
  },
  ready: {
    kicker: (n: number) => `${n} free session${n === 1 ? '' : 's'} ready`,
    title: 'Book your first session',
    body: (goal: string | null) =>
      goal
        ? `Your profile is complete. Pick a mentor who has already done what you’re aiming for: ${goal}.`
        : 'Your profile is complete. Pick a mentor who has already done what you’re aiming for.',
    action: 'Choose your mentor',
  },
  firstDone: { kicker: 'First session done' },
} as const;

export const GETTING_STARTED = {
  title: 'Getting started',
  count: (n: number) => `${n} of 4 done`,
  hide: 'Hide',
  hidden: 'Getting started hidden',
  undo: 'Undo',
  account: 'Create your account',
  profile: 'Complete your profile',
  book: 'Book your first session',
  invite: 'Invite a friend',
  done: 'Done',
  details: (n: number) => `${n} of 4 details done`,
  doneWith: (first: string, date: string) => `Done with ${first} on ${date}`,
  starter: 'Free with your starter credit',
  invitedNote: {
    unlocked: 'Friend joined ✓ · First session ✓ · 3 free sessions a month are on',
    friendJoined: 'Friend joined ✓ · Next: attend your first session',
    sharedAfterFirst: 'Link shared · Starts when a friend joins',
    shared: 'Link shared · Starts when a friend joins and you attend your first session',
    none: 'Get 3 free sessions every month',
  },
} as const;

export const PROFILE_SHEET = {
  title: 'Your profile',
  subtitle: 'Mentors read this before your session.',
  count: (n: number) => `${n} of 4 done`,
  next: (field: string) => `Next: ${field}`,
  ready: 'Ready for your first session',
  addEducation: 'Add your most recent education',
  notAdded: 'Not added yet',
  drafted: 'Short bio · drafted for you, review it',
  bioPlaceholder: 'Your background and why this goal matters to you',
  add: 'Add',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  saveFailed: 'We couldn’t save your bio. Your text is still here, so try again.',
  choose: 'Choose your mentor',
} as const;

export const MENTORS_FOR_GOAL = 'Mentors for your goal';
