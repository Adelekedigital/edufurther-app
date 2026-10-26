/**
 * Send a reminder, on a mentee's pending request (`Mentee Bookings.dc.html`
 * `menteeReminder`; PRD Mentee Bookings). Reviewed against the ux-writer rules.
 */

/** The API's cap on the message (`POST /sessions/{id}/reminder`). */
export const REMINDER_MAX = 500;

/** The row's disabled button, and the pill's lead ("Reminder sent · …"). */
export const REMINDER_SENT = 'Reminder sent';

export const reminderCopy = (first: string) => ({
  title: `Send ${first} a reminder?`,
  subtitle: `We’ll email it to ${first} with your request. You can send one reminder per request.`,
  label: 'Reminder message',
  /** Day as "Tue, Oct 6" and start as "9:30 am", in the viewer's zone. */
  draft: (day: string, start: string) =>
    `Hi ${first}, just checking in on my request for ${day} at ${start}. Does this time still work for you?`,
  blank: 'Write a message to send.',
  back: 'Go back',
  send: 'Send reminder',
  sending: 'Sending…',
  /** The row's button. */
  row: 'Send a reminder',
  rowSent: REMINDER_SENT,
  /** Refusals, by the API's problem type. */
  alreadySent: `You’ve already sent ${first} a reminder for this request.`,
  closed: 'This request has closed, so the reminder can’t go.',
  offline: 'You’re offline. Try again when you reconnect.',
  failed: 'We couldn’t send your reminder. Try again.',
});
