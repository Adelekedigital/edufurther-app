/**
 * A part of the page (a dialog, a panel) whose code didn't download: after an
 * update while the tab was open, or offline. The rest of the page still works.
 */
export const LOAD_FAILED_COPY = {
  online: 'We couldn’t open this. Reload the page to try again.',
  offline: 'You’re offline, so this can’t open yet. Reconnect, then reload the page.',
  reload: 'Reload page',
  // In the place of a part that's always on the page (a tool, a panel).
  inline: 'We couldn’t load this.',
  tryAgain: 'Try again',
} as const;
