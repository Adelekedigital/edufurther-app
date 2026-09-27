import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { EmailCodeForm } from './EmailCodeForm';

const ok = async () => ({ ok: true as const });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const meta: Meta<typeof EmailCodeForm> = {
  title: 'Organisms/EmailCodeForm',
  component: EmailCodeForm,
  args: {
    title: 'Log in to EduFurther',
    footer: (
      <>
        New here? <a href="/signup">Create a free account</a>
      </>
    ),
    onSendCode: async () => (await wait(400), { ok: true }),
    onVerifyCode: async () => (await wait(400), { ok: true }),
  },
  decorators: [(S) => <div style={{ maxWidth: 400 }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof EmailCodeForm>;

export const EmailStep: Story = {};

export const SignUpInBooking: Story = {
  args: {
    title: 'Create a free account to finish booking',
    footer: (
      <>
        Have an account? <a href="/login">Log in</a>
      </>
    ),
  },
};

export const CodeStep: Story = {
  args: { onSendCode: ok },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Email address'), 'esther.adeyemi@example.com');
    await userEvent.click(c.getByRole('button', { name: 'Continue with email' }));
    await expect(c.getByLabelText('6-digit code')).toBeInTheDocument();
  },
};

export const WrongCode: Story = {
  args: { onSendCode: ok, onVerifyCode: async () => ({ ok: false, reason: 'invalidCode' }) },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Email address'), 'esther@example.com');
    await userEvent.click(c.getByRole('button', { name: 'Continue with email' }));
    await userEvent.type(c.getByLabelText('6-digit code'), '000000');
    await userEvent.click(c.getByRole('button', { name: 'Verify and continue' }));
  },
};

export const Offline: Story = {
  args: { onSendCode: async () => ({ ok: false, reason: 'offline' }) },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Email address'), 'esther@example.com');
    await userEvent.click(c.getByRole('button', { name: 'Continue with email' }));
  },
};

export const Narrow: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
