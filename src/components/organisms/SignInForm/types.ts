export type SignInMode = 'signup' | 'login';
export type SignInRole = 'mentee' | 'mentor';

/** Which screen of the flow is showing (Sign In.dc.html `step`, grouped by what renders). */
export type SignInStep = 'start' | 'code' | 'finish' | 'suspended';

/**
 * Why the start step's send didn't get the person to the code: offline
 * (`sendFailed`, the design's copy), refused by the server or rate-limited
 * (`sendUnavailable`, ours: "check your connection" would mislead), or
 * Google didn't finish (`googleError`).
 */
export type StartError = 'sendFailed' | 'sendUnavailable' | 'googleError';

/** What is wrong with the code just entered (`error`, `expired`, `locked`). */
export type CodeProblem =
  | { kind: 'wrong'; triesLeft: number }
  | { kind: 'expired' }
  | { kind: 'locked' }
  /** "Send a new code" didn't go out (rate limit, connection): ours, no design state. */
  | { kind: 'resendFailed' };
