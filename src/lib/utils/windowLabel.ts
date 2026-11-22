/**
 * A booking window as people say it: "1 week", "2 weeks", or "10 days" when it
 * isn't whole weeks. Its own module so the booking flow can name the window
 * without pulling the session-type editor's helpers into its bundle.
 */
export const windowLabel = (days: number) =>
  days % 7 === 0 ? `${days / 7} week${days === 7 ? '' : 's'}` : `${days} days`;
