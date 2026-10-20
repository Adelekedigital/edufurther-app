/**
 * Settings › Social links (Mentor Settings.dc.html `isSocial`,
 * linksScope=limited), word for word where the design writes them; ours where
 * it draws no state (loading, a failed load or save).
 */
export const SOCIAL_LINKS_COPY = {
  tab: 'Social links',
  title: 'Social links',
  sub: 'Mentees check these to get to know you before they book.',
  add: 'Add link',
  platform: 'Platform',
  /** The field's label: "X handle"; a website's is its address. */
  field: (label: string) => `${label} handle`,
  websiteField: 'Website address',
  noteDefault: 'You can paste the full link too',
  noteShape: 'Enter the handle only, without spaces or slashes',
  /** Ours: a handle with no space or slash that still isn't one (the backend's rule). */
  noteHandle: (label: string) => `That handle won’t work on ${label}. Check it and try again.`,
  /** Ours: the design's rule is "a dot and a 2-letter ending". */
  noteWebsite: 'Enter a web address, like yoursite.com',
  noteLooksLike: (label: string) => `Looks like ${label}. We’ll show its icon.`,
  saveNew: 'Add link',
  saveEdit: 'Save link',
  saving: 'Saving…',
  cancel: 'Cancel',
  empty: 'No links yet. Add LinkedIn so mentees can see your background.',
  editAria: (label: string) => `Edit ${label}`,
  removeAria: (label: string) => `Remove ${label}`,
  removeTitle: 'Remove this profile?',
  /** Owner 2026-10-20: no link page, so not "…and link page". */
  removeSub: (label: string) => `Your ${label} icon will be removed from your profile.`,
  keep: 'Keep it',
  remove: 'Remove',
  removing: 'Removing…',
  /** Toasts (the design's flash). "Link added" is ours: the design adds without one. */
  added: 'Link added',
  updated: 'Link updated',
  removed: 'Profile removed',
  loading: 'Loading your links',
  loadError: 'We couldn’t load your links. Check your connection and try again.',
  retry: 'Try again',
  /** Save refusals (backend #507), each in the page's words. */
  taken: (label: string) => `You’ve already added ${label}. Edit that one instead.`,
  websiteLimit: 'You can add up to 3 websites.',
  saveFailed: 'Your link didn’t save. Try again in a moment.',
  /** Changed a link that was removed elsewhere (a 404). */
  gone: 'That link was already removed. Your list is up to date.',
  removeFailed: 'That didn’t go through. Try again in a moment.',
} as const;
