/**
 * The leave dialog for a form that can save itself (Mentee Settings.dc.html
 * `leaveGuard` confirm; `SaveChangesDialog`). App-wide, so not in one
 * screen's copy file.
 */
export const LEAVE_COPY = {
  title: 'Save your changes?',
  sub: (where: string) => `Your changes on ${where} haven’t been saved yet.`,
  discard: 'Discard',
  save: 'Save and continue',
  keep: 'Keep editing',
  // Leaving by Logout: each choice says it logs out too.
  discardLogout: 'Discard and log out',
  saveLogout: 'Save and log out',
} as const;
