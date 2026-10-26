/** Google sign-in didn't start or finish: the same words wherever "Continue with Google" is. */
export const GOOGLE_SIGN_IN_FAILED = 'Google sign-in didn’t finish. Try again, or use your email.';

/**
 * Arriving through an invite link (issue 281). The line above the sign-in
 * title names the inviter; the new account's toast says the invite is saved
 * before where it goes next. Run past the UX writer 2026-10-25.
 */
export const INVITE_COPY = {
  /** `/invite/{code}` for the moment before sign-up opens (screen readers only). */
  opening: 'Opening sign-up…',
  signupLine: (first: string) => `${first} invited you. Sign up and your invite is saved.`,
  loginLine: (first: string) => `${first} invited you. Invites count for new accounts.`,
  /** Leads the new account's toast body: "Damilola’s invite is saved. Next, let’s find…". */
  saved: (first: string | null) =>
    first ? `${first}’s invite is saved.` : 'Your invite is saved.',
};
