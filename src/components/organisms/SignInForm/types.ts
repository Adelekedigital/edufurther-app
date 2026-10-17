export type SignInMode = 'signup' | 'login';
export type SignInRole = 'mentee' | 'mentor';

/** Which screen of the flow is showing (Sign In.dc.html `step`, grouped by what renders). */
export type SignInStep = 'start' | 'code' | 'finish' | 'suspended';

/** Why the start step's send didn't get the person to the code (`sendFailed`, `googleError`). */
export type StartError = 'sendFailed' | 'googleError';

/** What is wrong with the code just entered (`error`, `expired`, `locked`). */
export type CodeProblem =
  | { kind: 'wrong'; triesLeft: number }
  | { kind: 'expired' }
  | { kind: 'locked' }
  /** "Send a new code" didn't go out (rate limit, connection): ours, no design state. */
  | { kind: 'resendFailed' };
