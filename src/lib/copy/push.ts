/** The one-time notifications ask (owner, 2026-11-07: after a meaningful moment). */
export const PUSH_COPY = {
  ask: {
    message: 'Get a notification when they reply.',
    booking: 'Get notified about this booking and a reminder before it starts.',
    mentor: 'Get notified when someone books you, and a reminder before each session.',
  },
  turnOn: 'Turn on',
  on: 'Notifications are on.',
  blocked: 'Notifications are blocked. You can allow them in your browser or phone settings.',
  failed: "We couldn't turn on notifications. Try again in Settings.",
} as const;
