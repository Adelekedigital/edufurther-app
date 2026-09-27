import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailCodeForm } from './EmailCodeForm';

const ok = async () => ({ ok: true as const });
const setup = (over: Partial<Parameters<typeof EmailCodeForm>[0]> = {}) => {
  const props = {
    title: 'Log in to EduFurther',
    onSendCode: vi.fn(ok),
    onVerifyCode: vi.fn(ok),
    ...over,
  };
  render(<EmailCodeForm {...props} />);
  return props;
};

describe('EmailCodeForm', () => {
  it('rejects an invalid email without calling the API, and focuses the field', async () => {
    const p = setup();
    await userEvent.type(screen.getByLabelText('Email address'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(screen.getByRole('alert')).toHaveTextContent('like you@example.com');
    expect(screen.getByLabelText('Email address')).toHaveFocus();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(p.onSendCode).not.toHaveBeenCalled();
  });

  it('email → code → verify', async () => {
    const p = setup();
    await userEvent.type(screen.getByLabelText('Email address'), ' ada@example.com ');
    await userEvent.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(p.onSendCode).toHaveBeenCalledWith('ada@example.com');
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    const field = screen.getByLabelText('6-digit code');
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute('autocomplete', 'one-time-code');
    await userEvent.type(field, '12a3456');
    expect(field).toHaveValue('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(p.onVerifyCode).toHaveBeenCalledWith('ada@example.com', '123456');
    expect(screen.getByRole('button', { name: /Send a new code in \d+s/ })).toBeDisabled();
  });

  it('a wrong code says so and keeps the user on the code step', async () => {
    setup({
      onVerifyCode: vi.fn(async () => ({ ok: false as const, reason: 'invalidCode' as const })),
    });
    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Continue with email' }));
    await userEvent.type(screen.getByLabelText('6-digit code'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('That code didn’t work');
    expect(screen.getByLabelText('6-digit code')).toHaveFocus();
  });

  it('rate limit on send stays on the email step with the reason', async () => {
    setup({
      onSendCode: vi.fn(async () => ({ ok: false as const, reason: 'rateLimited' as const })),
    });
    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Too many tries');
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  });

  it('"Use a different email" goes back', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('Email address'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Continue with email' }));
    await userEvent.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(screen.getByLabelText('Email address')).toHaveValue('ada@example.com');
  });
});
