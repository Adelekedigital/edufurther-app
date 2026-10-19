/**
 * Booking copy for a signed-in mentee who hasn't finished onboarding
 * (BookingModal.dc.html round 4: `setupState=unfinished`, `gateCopy=clear`,
 * the saved default; `resumeState`; `creditToast`).
 */
export const FINISH_SETUP_COPY = {
  title: (first: string) => `Finish setting up to book ${first}`,
  body: 'Tell us what you need help with and your study plans. It’s 2 short steps, then you’ll come back here to confirm. Your answers are saved, and your first session is free.',
  cta: 'Finish setup',
  /** Back from onboarding, the time gone meanwhile (`resumeState=taken`). */
  taken: 'That time was just booked. Pick another one. Your answers are saved.',
  /** Back from onboarding, the starter credit paid (`creditToast`). */
  credit: 'You’re all set. 1 free credit added.',
};
