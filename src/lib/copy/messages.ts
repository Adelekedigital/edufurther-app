/**
 * Messages copy (`/messages`, SendMessage, FileViewer's message use): the
 * strings as drawn in Messages.dc.html and SendMessage.dc.html, with the
 * founder's changes in PRD Messages (Oct 26): the session window is 15 minutes
 * either side of the start; Report is an email. `{First}` is the other
 * person's first name. Reviewed with edufurther-ux-writer; no em dashes.
 */

import type { SupportPerson } from '@/lib/utils/mailto';

export const LIST_COPY = {
  title: 'Messages',
  settings: 'Message settings',
  newMessage: 'New message',
  searchLabel: 'Search messages',
  searchPlaceholder: 'Search by name or school',
  filterLabel: 'Filter',
  all: 'All',
  unread: (n: number) => (n > 0 ? `Unread (${n})` : 'Unread'),
  /** The row's accessible name. */
  rowName: (name: string, unread: number) => (unread > 0 ? `${name}, ${unread} unread` : name),
  role: (role: 'mentor' | 'mentee') => (role === 'mentor' ? 'Mentor' : 'Mentee'),
  next: (when: string) => `Next: ${when}`,
  you: 'You: ',
  sentFile: (name: string) => `Sent a file: ${name}`,
  noMessages: 'No messages yet',
  deletedMine: 'You deleted this message',
  deletedTheirs: 'This message was deleted',
  loadError: 'We couldn’t load your messages.',
  loadErrorBody: 'Check your connection and try again.',
  tryAgain: 'Try again',
  /** The busy list, for screen readers. */
  loading: 'Loading your messages',
  /** The nav badge's meaning, read after "Messages". */
  navCount: (n: number) => (n === 1 ? '1 unread message' : `${n} unread messages`),
} as const;

/** What `/messages` says to a guest (ours: a guest never reaches it from the nav). */
export const MESSAGES_GATE_COPY = {
  guestTitle: 'Log in to see your messages',
  guestDescription:
    'Chat with the mentors and mentees you’ve booked with, before and after your sessions.',
} as const;

export const EMPTY_INBOX_COPY = {
  title: 'No messages yet',
  body: (mentee: boolean) =>
    mentee
      ? 'You can message a mentor once they confirm your booking. Your chats show up here.'
      : 'You can message a mentee once you confirm their booking. Your chats show up here.',
  findMentor: 'Find a mentor',
} as const;

export const NO_ROWS_COPY = {
  unreadTitle: 'No unread messages',
  unreadBody: 'You’ve read every message. New ones show up here.',
  searchTitle: 'No chats found',
  searchBody: 'Check the spelling, or search by school instead.',
} as const;

export const NEW_MESSAGE_COPY = {
  title: 'New message',
  subtitle: (mentee: boolean) =>
    mentee
      ? 'Mentors you’ve connected with through approved requests or past sessions.'
      : 'Mentees you’ve connected with through approved requests or past sessions.',
  searchLabel: 'Search people',
  searchPlaceholder: 'Search by name',
  noMatch: 'No one matches that name.',
  /** No connections at all (no search typed). */
  noPeople: (mentee: boolean) =>
    mentee
      ? 'You can message a mentor once they confirm your booking.'
      : 'You can message a mentee once you confirm their booking.',
  bookFirst: 'Want to talk to someone new? Book a session first.',
  findMentor: 'Find a mentor',
} as const;

export const CHAT_COPY = {
  back: 'Back to messages',
  chatLabel: (name: string) => `Chat with ${name}`,
  nextSession: (when: string) => `Next session ${when}`,
  more: 'More options',
  viewProfile: 'View profile',
  viewBooking: 'View booking',
  report: 'Report',
  privacy: (first: string) =>
    `Only you and ${first} can see this chat. If you report it, our team can review it.`,
  newCount: (n: number) => `${n} new`,
  sent: 'Sent',
  read: 'Read',
  edited: 'Edited ·',
  waiting: 'Waiting to send',
  notSent: 'Not sent.',
  tryAgain: 'Try again',
  retried: 'Message sent.',
  deletedMine: 'You deleted this message',
  deletedTheirs: 'This message was deleted',
  earlier: 'Show earlier messages',
  loadError: 'We couldn’t load this chat.',
  gone: 'This chat isn’t available.',
  goneBody: 'You can message someone once a booking between you is confirmed.',
} as const;

export const EMPTY_CHAT_COPY = {
  title: (first: string) => `Say hello to ${first}`,
  menteeUpcoming: (first: string, when: string) =>
    `${first} confirmed your session for ${when}. Say hi and share what you’d like to cover.`,
  mentorUpcoming: (when: string) => `They booked ${when}. Say hi and tell them how to prepare.`,
  /** Both roles with nothing upcoming (Q5 default for mentors). */
  noneUpcoming: 'Pick up where your last session left off.',
} as const;

export const STARTERS_COPY = {
  lead: 'Not sure what to say? Pick one, then make it yours.',
} as const;

/**
 * The starter chips (PRD "Starters", Q6), filled from data; a chip whose data
 * is missing isn't shown (startersFor). `{First}` is the other person.
 */
export const STARTERS = {
  intro: {
    label: 'Introduce yourself',
    text: (first: string, me: string, degree: string, field: string, term: string | null) =>
      `Hi ${first}, I’m ${me}. I’m applying for ${degree} in ${field}${term ? ` for ${term}` : ''}. Looking forward to our session!`,
  },
  cover: {
    label: 'Share what to cover',
    text: (first: string, topic: string) =>
      `Hi ${first}, in our session I’d love to focus on ${topic}.`,
  },
  askPrepare: {
    label: 'Ask what to prepare',
    text: (first: string) =>
      `Hi ${first}, is there anything I should prepare or send before our session?`,
  },
  school: {
    label: 'Ask about your school',
    text: (first: string, school: string) =>
      `Hi ${first}, what was applying to ${school} like for you?`,
  },
  welcome: {
    label: 'Welcome them',
    text: (first: string) =>
      `Hi ${first}, thanks for booking! What would you like to focus on in our session?`,
  },
  documents: {
    label: 'Ask for documents',
    text: (first: string) => `Hi ${first}, could you share your CV or draft here before we meet?`,
  },
  howToPrepare: {
    label: 'Share how to prepare',
    text: (first: string) =>
      `Hi ${first}, before we meet, write down your top two questions so we can start there.`,
  },
  /**
   * "Share what to cover": each onboarding help area (catalog slug) in the
   * mentee's own voice, as it reads after "focus on". Generic per area, never
   * narrower or wider than its name: the mentee adds specifics by editing
   * (owner, 2026-10-28). An area missing here falls back to its catalog name.
   */
  topics: {
    'program-selection': 'choosing a program',
    'test-preparation': 'preparing for my tests',
    'document-preparation': 'my application documents',
    'school-selection': 'choosing a school',
    'scholarships-financial-aid': 'finding scholarships',
    'interview-preparation': 'preparing for my interviews',
  } as Record<string, string>,
  /** The degree goal as it reads after "applying for" (DEGREE_OPTIONS values). */
  degree: { bachelors: 'a bachelor’s', masters: 'a master’s', mba: 'an MBA', doctorate: 'a PhD' },
} as const;

export const COMPOSER_COPY = {
  offline: 'You’re offline. We’ll send your messages when you’re back online.',
  contactNotice:
    'Sharing contact details? Keep your chat and files here too. We can only help with problems in messages sent on EduFurther.',
  attach: 'Attach a file',
  attachHint: 'PDF or Word (.docx) · max 5 MB',
  placeholder: (first: string) => `Message ${first}`,
  send: 'Send',
  removeFile: 'Remove file',
  tooBig: 'That file is over 5 MB. Choose a smaller one.',
  wrongType: 'Use a PDF or Word (.docx) file.',
} as const;

export const LOCK_COPY = {
  paused: (first: string) =>
    `${first} isn’t taking messages right now. You can still read your chat.`,
  closed: (first: string) =>
    `${first} closed their account. You can still read your past messages.`,
} as const;

export const SETTINGS_COPY = {
  title: 'Message emails',
  switchLabel: 'Email me about unread messages',
  switchHint: 'If a message is still unread after 15 minutes. At most one email an hour.',
  sessionNote:
    'Messages sent from 15 minutes before a session to 15 minutes after it starts are emailed right away, even with this off.',
  done: 'Done',
  on: 'Unread message emails are on.',
  off: 'Unread message emails are off.',
  saveError: 'We couldn’t save that. Try again.',
  loadError: 'We couldn’t load your email settings. Check your connection and try again.',
  tryAgain: 'Try again',
} as const;

/** Report (v1): a prefilled email to support, in the support-email pattern. */
export const REPORT_REQUEST = {
  subject: (name: string) => `Messages: Report a chat (${name})`,
  body: (them: { name: string; mentor: boolean }, chatUrl: string) => (p: SupportPerson) =>
    [
      'Hi EduFurther team,',
      '',
      `I want to report my chat with ${them.name} (${them.mentor ? 'Mentor' : 'Mentee'}).`,
      '',
      'What happened:',
      '',
      '',
      `Chat: ${chatUrl}`,
      `Name: ${p.name}`,
      `Account email: ${p.email}`,
      `Role: ${p.mentor ? 'Mentor' : 'Mentee'}`,
      '',
      'Thanks,',
      p.firstName,
    ].join('\n'),
} as const;
