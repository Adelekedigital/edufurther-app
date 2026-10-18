import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SignInForm, type SignInFormProps } from './SignInForm';

const base: SignInFormProps = {
  mode: 'signup',
  role: 'mentee',
  step: 'start',
  email: '',
  onEmailChange: fn(),
  fullName: '',
  onFullNameChange: fn(),
  onSendCode: fn(),
  onGoogle: fn(),
  code: '',
  onCodeChange: fn(),
  onVerify: fn(),
  resendIn: 0,
  onResend: fn(),
  onUseDifferentEmail: fn(),
  onFinish: fn(),
  switchHref: '/login',
  roleHref: '/signup?role=mentor',
};

const filled = { email: 'amara@example.com', fullName: 'Amara Okafor' };

/** The page around the form: ink-50 with the card centred on desktop, plain white on phones. */
const meta: Meta<typeof SignInForm> = {
  title: 'Organisms/SignInForm',
  component: SignInForm,
  args: base,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (S) => (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'var(--space-12) var(--space-6)',
          background: 'var(--ink-50)',
        }}
      >
        {S()}
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SignInForm>;

const phone = { viewport: { value: 'mobile2', isRotated: false } };

// ---- start ----
export const SignUpMentee: Story = {};
export const SignUpMenteeFilled: Story = { args: filled };
export const SignUpMentor: Story = {
  args: { role: 'mentor', switchHref: '/login', roleHref: '/signup' },
};
export const LogIn: Story = {
  args: { mode: 'login', switchHref: '/signup', email: 'amara@example.com' },
};
export const LogInLastUsedGoogle: Story = { args: { mode: 'login', lastUsed: true } };
export const Sending: Story = { args: { ...filled, sending: true } };
export const SendFailed: Story = { args: { ...filled, startError: 'sendFailed' } };
/** The server refused or rate-limited the send (not a connection problem). */
export const SendUnavailable: Story = { args: { ...filled, startError: 'sendUnavailable' } };
export const GoogleError: Story = { args: { ...filled, startError: 'googleError' } };
export const EmailTypo: Story = { args: { fullName: 'Amara Okafor', email: 'amara@gmial.com' } };
export const NameRefused: Story = {
  args: { ...filled, fullName: 'Amara', nameError: 'Enter your first and last name.' },
};
export const Offline: Story = { args: { ...filled, offline: true } };

// ---- code ----
const code = { ...filled, step: 'code' as const, resendIn: 24 };
export const Code: Story = { args: code };
export const Verifying: Story = { args: { ...code, code: '482913', verifying: true } };
export const WrongCode: Story = {
  args: { ...code, code: '482913', codeProblem: { kind: 'wrong', triesLeft: 3 } },
};
export const WrongCodeOneLeft: Story = {
  args: { ...code, code: '482913', codeProblem: { kind: 'wrong', triesLeft: 1 } },
};
export const Expired: Story = { args: { ...code, codeProblem: { kind: 'expired' } } };
export const Locked: Story = { args: { ...code, codeProblem: { kind: 'locked' } } };
export const Resent: Story = { args: { ...code, resentCount: 1, resendIn: 30 } };
export const ResendReady: Story = { args: { ...code, resendIn: 0 } };
export const MentorCode: Story = { args: { ...code, role: 'mentor' } };

// ---- finish, suspended, redirecting ----
export const Finish: Story = { args: { ...filled, mode: 'login', step: 'finish', fullName: '' } };
export const FinishFilled: Story = { args: { ...filled, mode: 'login', step: 'finish' } };
/** A browser still holding a session with no account: "Use a different email" signs out first. */
export const FinishSigningOut: Story = {
  args: { ...filled, mode: 'signup', step: 'finish', fullName: '', signingOut: true },
};
export const FinishSignOutFailed: Story = {
  args: {
    ...filled,
    mode: 'signup',
    step: 'finish',
    fullName: '',
    signOutError: 'We couldn’t sign you out. Try again.',
  },
};
export const Suspended: Story = { args: { ...filled, mode: 'login', step: 'suspended' } };
export const Redirecting: Story = { args: { ...code, code: '482913', redirecting: true } };

// ---- phones (below 900px the card drops away) ----
export const SignUpPhone: Story = { args: filled, globals: phone };
export const CodePhone: Story = {
  args: { ...code, codeProblem: { kind: 'wrong', triesLeft: 4 } },
  globals: phone,
};
export const LogInPhone: Story = { args: { mode: 'login', lastUsed: true }, globals: phone };

/** Type in it: the fields and the code are live; sending goes straight to the code step. */
export const Playground: Story = {
  render: function Playground(args) {
    const [s, set] = useState({ step: args.step, email: '', fullName: '', code: '' });
    return (
      <SignInForm
        {...args}
        {...s}
        onEmailChange={(email) => set({ ...s, email })}
        onFullNameChange={(fullName) => set({ ...s, fullName })}
        onCodeChange={(c) => set({ ...s, code: c })}
        onSendCode={() => set({ ...s, step: 'code' })}
        onUseDifferentEmail={() => set({ ...s, step: 'start', code: '' })}
      />
    );
  },
};
