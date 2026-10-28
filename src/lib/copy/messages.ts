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
    `${first} confirmed your session for ${when}. Say hi and share what you'd like to cover.`,
  mentorUpcoming: (when: string) => `They booked ${when}. Say hi and tell them how to prepare.`,
  /** Both roles with nothing upcoming (Q5 default for mentors). */
  noneUpcoming: 'Pick up where your last session left off.',
} as const;

export const STARTERS_COPY = {
  lead: 'Not sure what to say? Tap one to start.',
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

/** SendMessage (SendMessage.dc.html): the pop-up behind every Message button. */
export const SEND_MESSAGE_COPY = {
  title: (first: string) => `Message ${first}`,
  placeholder: (first: string) => `Write to ${first}`,
  attach: COMPOSER_COPY.attach,
  attachHint: COMPOSER_COPY.attachHint,
  attachHintPhone: 'PDF or Word · 5 MB',
  attached: '1 file attached',
  viewFile: (name: string) => `View ${name}`,
  removeFile: COMPOSER_COPY.removeFile,
  left: (n: number) => `${n} left`,
  contactNotice: COMPOSER_COPY.contactNotice,
  where: (first: string) => `This goes to your chat with ${first} in Messages.`,
  whereSoon: (first: string) =>
    `Your session starts soon, so we’ll also email this to ${first} right away.`,
  cancel: 'Cancel',
  send: 'Send message',
  sending: 'Sending…',
  empty: (first: string) => `Write a message to ${first} first.`,
  failed: 'Not sent. Check your connection and try again.',
  /** Offline: the outbox holds it and sends it on reconnect. */
  waiting: COMPOSER_COPY.offline,
  waitUpload: 'Wait for your file to finish uploading.',
  uploading: 'Uploading…',
  sentTitle: 'Message sent',
  sentSub: (first: string) => `It’s in your chat with ${first} in Messages.`,
  sentSubSoon: (first: string) =>
    `It’s in your chat with ${first}, and we emailed it to them because your session starts soon.`,
  openChat: 'Open chat',
  done: 'Done',
} as const;

/** A Message button (Bookings, Session Join, Mentor Profile; PRD table). */
export const MESSAGE_BUTTON_COPY = {
  send: 'Send a message',
  short: 'Message',
  to: (first: string) => `Message ${first}`,
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
