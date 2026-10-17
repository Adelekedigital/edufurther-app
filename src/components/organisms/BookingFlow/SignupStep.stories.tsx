import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SignupStep } from './SignupStep';
import type { GuestSignIn } from './types';

const guest: GuestSignIn = {
  stage: 'email',
  email: '',
  onEmailChange: fn(),
  sending: false,
  googleBusy: false,
  onSendCode: fn(),
  onGoogle: fn(),
  code: '',
  onCodeChange: fn(),
  onVerify: fn(),
  verifying: false,
  resentCount: 0,
  resendIn: 24,
  onResend: fn(),
  onUseDifferentEmail: fn(),
  fullName: '',
  onFullNameChange: fn(),
  finishing: false,
  onFinish: fn(),
  signedInAs: null,
  offline: false,
};

const at = (over: Partial<GuestSignIn>) => ({ guest: { ...guest, ...over } });

/** BookingModal.dc.html's guest step, in the modal's step column (its main column is 476px). */
const meta: Meta<typeof SignupStep> = {
  title: 'Organisms/BookingFlow/SignupStep',
  component: SignupStep,
  args: {
    guest,
    pick: { sessionTypeId: 'st1', time: '2026-10-20T09:00:00Z' },
    firstName: 'Gbenga',
  },
  decorators: [(S) => <div style={{ maxWidth: 476, padding: 24 }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof SignupStep>;

export const Email: Story = {};
export const EmailFilled: Story = { args: at({ email: 'amara@example.com' }) };
export const SendFailed: Story = { args: at({ email: 'amara@example.com', error: 'sendFailed' }) };
export const GoogleError: Story = { args: at({ error: 'googleError' }) };
export const Offline: Story = { args: at({ email: 'amara@example.com', offline: true }) };
export const Code: Story = { args: at({ stage: 'code', email: 'amara@example.com' }) };
export const CodeWrong: Story = {
  args: at({
    stage: 'code',
    email: 'amara@example.com',
    code: '482913',
    codeProblem: { kind: 'wrong', triesLeft: 3 },
  }),
};
export const CodeLocked: Story = {
  args: at({ stage: 'code', email: 'amara@example.com', codeProblem: { kind: 'locked' } }),
};
export const Name: Story = { args: at({ stage: 'name', email: 'amara@example.com' }) };
export const NameRefused: Story = {
  args: at({
    stage: 'name',
    email: 'amara@example.com',
    fullName: 'Amara',
    nameError: 'Enter your first and last name.',
  }),
};
export const Suspended: Story = { args: at({ stage: 'suspended', email: 'amara@example.com' }) };
export const PhoneEmail: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};
