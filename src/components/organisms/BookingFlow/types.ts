import type { CodeProblem } from '@/components/organisms/SignInForm/types';

/** BookingModal.dc.html `showFirstReasons`: one reason a new mentor is worth booking. */
export type FirstReason = {
  icon: 'flight_takeoff' | 'workspace_premium';
  /** The bold lead, e.g. "Made the move you’re planning." */
  k: string;
  v: string;
};

/** Where a guest is in signing in inside the modal (BookingModal.dc.html `gs`). */
export type GuestStage = 'email' | 'code' | 'name' | 'suspended' | 'done';

/** What is being booked, handed over when signing in leaves the modal. */
export type GuestPick = { sessionTypeId: string; time: string };

/**
 * The guest step's sign-in, run by the page (an organism makes no calls). The
 * flow shows the stage and hands back the pick where it's needed: a new
 * account may continue in onboarding, and Google leaves the page.
 */
export type GuestSignIn = {
  stage: GuestStage;
  email: string;
  onEmailChange: (value: string) => void;
  sending: boolean;
  /** The code couldn't be sent, or Google didn't finish. */
  error?: 'sendFailed' | 'googleError';
  googleBusy: boolean;
  onSendCode: () => void;
  onGoogle: (pick: GuestPick) => void;
  code: string;
  onCodeChange: (code: string) => void;
  onVerify: (code: string) => void;
  verifying: boolean;
  codeProblem?: CodeProblem;
  resentCount: number;
  resendIn: number;
  onResend: () => void;
  onUseDifferentEmail: () => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  nameError?: string;
  finishing: boolean;
  onFinish: (pick: GuestPick) => void;
  /** An existing account signed in: "Logged in as {email}." on the steps after. */
  signedInAs: string | null;
  offline: boolean;
};
