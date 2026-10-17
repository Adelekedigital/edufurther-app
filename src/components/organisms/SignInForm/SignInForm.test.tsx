import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm, type SignInFormProps } from './SignInForm';

function props(over: Partial<SignInFormProps> = {}): SignInFormProps {
  return {
    mode: 'signup',
    role: 'mentee',
    step: 'start',
    email: '',
    onEmailChange: vi.fn(),
    fullName: '',
    onFullNameChange: vi.fn(),
    onSendCode: vi.fn(),
    onGoogle: vi.fn(),
    code: '',
    onCodeChange: vi.fn(),
    onVerify: vi.fn(),
    resendIn: 0,
    onResend: vi.fn(),
    onUseDifferentEmail: vi.fn(),
    onFinish: vi.fn(),
    switchHref: '/login',
    roleHref: '/signup?role=mentor',
    ...over,
  };
}

/** The page's job in miniature: hold the values the form reports. */
function Live(over: Partial<SignInFormProps>) {
  const [email, setEmail] = useState(over.email ?? '');
  const [fullName, setFullName] = useState(over.fullName ?? '');
  const [code, setCode] = useState(over.code ?? '');
  return (
    <SignInForm
      {...props(over)}
      email={email}
      onEmailChange={setEmail}
      fullName={fullName}
      onFullNameChange={setFullName}
      code={code}
      onCodeChange={setCode}
    />
  );
}

const sendButton = () => screen.getByRole('button', { name: 'Email me a code' });

describe('SignInForm — start', () => {
  it('signs up a mentee: Full name above Email, legal line, both switches, no subline', () => {
    render(<SignInForm {...props()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Create your free account' })).toBeVisible();
    const name = screen.getByLabelText('Full name');
    const email = screen.getByLabelText('Email');
    expect(name.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/By continuing, you agree/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /Join as a mentor/ })).toHaveAttribute(
      'href',
      '/signup?role=mentor',
    );
    expect(screen.queryByText(/Free 1:1 sessions/)).not.toBeInTheDocument();
  });

  it('signs up a mentor under "For mentors", with the way back to mentee', () => {
    render(<SignInForm {...props({ role: 'mentor', roleHref: '/signup' })} />);
    expect(screen.getByText('For mentors')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Apply to mentor' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Continue as a mentee/ })).toHaveAttribute('href', '/signup');
  });

  it('logs in with no name, no legal line and no role switch', () => {
    render(<SignInForm {...props({ mode: 'login', switchHref: '/signup', lastUsed: true })} />);
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeVisible();
    expect(screen.getByText('Welcome back. Pick up where you left off.')).toBeVisible();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    expect(screen.queryByText(/By continuing/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Join as a mentor/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('button', { name: 'Continue with Google, last used' })).toBeVisible();
  });

  it('shows Last used at log-in only', () => {
    render(<SignInForm {...props({ lastUsed: true })} />);
    expect(screen.queryByText('Last used')).not.toBeInTheDocument();
  });

  it('keeps the code button off until the email is valid and the name passes', async () => {
    render(<Live />);
    expect(sendButton()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Email'), 'amara@example.com');
    expect(sendButton()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Full name'), 'Amara');
    expect(sendButton()).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Full name'), ' Okafor');
    expect(sendButton()).toBeEnabled();
  });

  it('says what is wrong with the name once they leave the field', async () => {
    render(<Live />);
    await userEvent.type(screen.getByLabelText('Full name'), 'Amara');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your first and last name.');
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends on Enter', async () => {
    const onSendCode = vi.fn();
    render(<Live mode="login" onSendCode={onSendCode} />);
    await userEvent.type(screen.getByLabelText('Email'), 'amara@example.com{Enter}');
    expect(onSendCode).toHaveBeenCalledOnce();
  });

  it('fixes a mistyped domain in one tap', async () => {
    render(<Live mode="login" email="Amara@gmial.com" />);
    await userEvent.click(screen.getByRole('button', { name: 'amara@gmail.com' }));
    expect(screen.getByLabelText('Email')).toHaveValue('amara@gmail.com');
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
  });

  it('turns off both ways to sign in while offline, and says so in a standing region', () => {
    const { rerender } = render(
      <SignInForm {...props({ mode: 'login', email: 'amara@example.com' })} />,
    );
    const regions = screen.getAllByRole('status');
    rerender(<SignInForm {...props({ mode: 'login', email: 'amara@example.com', offline: true })} />);
    expect(regions.some((r) => /You’re offline/.test(r.textContent ?? ''))).toBe(true);
    expect(sendButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled();
  });

  it('keeps what was typed when Google sign-in fails', () => {
    render(
      <SignInForm
        {...props({ email: 'amara@example.com', fullName: 'Amara Okafor', startError: 'googleError' })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in didn’t finish.');
    expect(screen.getByLabelText('Email')).toHaveValue('amara@example.com');
  });
});

describe('SignInForm — code', () => {
  const code = { step: 'code' as const, email: 'amara@example.com', resendIn: 24 };

  it('says where the code went and checks itself at six digits', async () => {
    const onVerify = vi.fn();
    render(<Live {...code} onVerify={onVerify} />);
    expect(screen.getByText('We sent a 6-digit code to amara@example.com.')).toBeVisible();
    const field = screen.getByLabelText('6-digit code');
    expect(field).toHaveAttribute('autocomplete', 'one-time-code');
    expect(field).toHaveAttribute('inputmode', 'numeric');
    await userEvent.type(field, '48a29 13');
    expect(field).toHaveValue('482913');
    expect(onVerify).toHaveBeenCalledOnce();
    expect(onVerify).toHaveBeenCalledWith('482913');
  });

  it('counts the tries left', () => {
    const { rerender } = render(
      <SignInForm {...props({ ...code, code: '111111', codeProblem: { kind: 'wrong', triesLeft: 3 } })} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('That code didn’t work. 3 tries left.');
    rerender(
      <SignInForm {...props({ ...code, code: '111111', codeProblem: { kind: 'wrong', triesLeft: 1 } })} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('1 try left.');
  });

  it('counts down to the next code', () => {
    render(<SignInForm {...props(code)} />);
    expect(screen.getByRole('button', { name: 'Send a new code in 0:24' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('offers a new code at once when the code has expired, and stops Verify', () => {
    render(<SignInForm {...props({ ...code, code: '111111', codeProblem: { kind: 'expired' } })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This code has expired.');
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
    expect(screen.getByLabelText('6-digit code')).toBeDisabled();
  });

  it('stops Verify and resend while locked', () => {
    render(<SignInForm {...props({ ...code, resendIn: 0, codeProblem: { kind: 'locked' } })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too many wrong codes.');
    expect(screen.getByRole('button', { name: 'Send a new code' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
  });

  it('says a new code went out, in a region that was already there, each time', () => {
    const { rerender } = render(<SignInForm {...props(code)} />);
    const regions = screen.getAllByRole('status');
    regions.forEach((r) => expect(r).toBeEmptyDOMElement());
    rerender(<SignInForm {...props({ ...code, resentCount: 1 })} />);
    const status = regions.find((r) => r.textContent)!;
    expect(status).toHaveTextContent('New code sent to amara@example.com. Still nothing?');
    const first = status.firstChild;
    rerender(<SignInForm {...props({ ...code, resentCount: 2 })} />);
    expect(status.firstChild).not.toBe(first);
  });

  it('verifies on Enter, and goes back with Use a different email', async () => {
    const onVerify = vi.fn();
    const onUseDifferentEmail = vi.fn();
    render(<SignInForm {...props({ ...code, code: '482913', onVerify, onUseDifferentEmail })} />);
    await userEvent.type(screen.getByLabelText('6-digit code'), '{Enter}');
    expect(onVerify).toHaveBeenCalledWith('482913');
    await userEvent.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(onUseDifferentEmail).toHaveBeenCalledOnce();
  });

  it('has no switch or role links once the code is on its way', () => {
    render(<SignInForm {...props(code)} />);
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Join as a mentor/)).not.toBeInTheDocument();
  });
});

describe('SignInForm — finish and suspended', () => {
  it('asks an unknown email for a name, and creates the account on Enter', async () => {
    const onFinish = vi.fn();
    render(<Live mode="login" step="finish" email="amara@example.com" onFinish={onFinish} />);
    expect(screen.getByRole('heading', { name: 'Finish creating your account' })).toBeVisible();
    expect(screen.getByText(/There’s no EduFurther account for amara@example.com yet/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(screen.getByText(/By continuing/)).toBeVisible();
    await userEvent.type(screen.getByLabelText('Full name'), 'Amara Okafor{Enter}');
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('offers support by email when the account is suspended', () => {
    render(<SignInForm {...props({ mode: 'login', step: 'suspended', email: 'amara@example.com' })} />);
    expect(screen.getByRole('heading', { name: 'We can’t log you in' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      'mailto:support@edufurther.org',
    );
  });
});

describe('SignInForm — focus', () => {
  it('moves focus to the heading when the step changes, not on first render', () => {
    const { rerender } = render(<SignInForm {...props({ email: 'amara@example.com' })} />);
    expect(document.activeElement).toBe(document.body);
    rerender(<SignInForm {...props({ email: 'amara@example.com', step: 'code' })} />);
    expect(screen.getByRole('heading', { name: 'Check your email' })).toHaveFocus();
  });
});

describe('SignInForm — review fixes', () => {
  const code = { step: 'code' as const, email: 'amara@example.com', resendIn: 0 };

  it.each([
    ['482 913', '482913'],
    ['482-913', '482913'],
    ['Code: 482913', '482913'],
  ])('verifies a pasted %s whole', async (pasted, digits) => {
    const onVerify = vi.fn();
    render(<Live {...code} onVerify={onVerify} />);
    await userEvent.click(screen.getByLabelText('6-digit code'));
    await userEvent.paste(pasted);
    expect(onVerify).toHaveBeenCalledOnce();
    expect(onVerify).toHaveBeenCalledWith(digits);
  });

  it('keeps focus in the code field while it is checked', () => {
    render(<SignInForm {...props({ ...code, code: '482913', verifying: true })} />);
    const field = screen.getByLabelText('6-digit code');
    expect(field).not.toBeDisabled();
    expect(field).toHaveAttribute('readonly');
  });

  it('puts focus back in the field, code selected, after a wrong code', () => {
    const { rerender } = render(<SignInForm {...props({ ...code, code: '482913', verifying: true })} />);
    rerender(
      <SignInForm {...props({ ...code, code: '482913', codeProblem: { kind: 'wrong', triesLeft: 4 } })} />,
    );
    const field = screen.getByLabelText<HTMLInputElement>('6-digit code');
    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(6);
  });

  it('sends a new code without dropping focus, and refuses while the countdown runs or a check is out', async () => {
    const onResend = vi.fn();
    const { rerender } = render(<SignInForm {...props({ ...code, onResend })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(onResend).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('6-digit code')).toHaveFocus();

    rerender(<SignInForm {...props({ ...code, onResend, resendIn: 30 })} />);
    const wait = screen.getByRole('button', { name: 'Send a new code in 0:30' });
    expect(wait).toHaveAttribute('aria-disabled', 'true');
    expect(wait).not.toBeDisabled();
    await userEvent.click(wait);
    rerender(<SignInForm {...props({ ...code, onResend, code: '482913', verifying: true })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(onResend).toHaveBeenCalledOnce();
  });

  it('says why when Enter is pressed with a one-word name at the finish step', async () => {
    const onFinish = vi.fn();
    render(<Live mode="login" step="finish" email="amara@example.com" onFinish={onFinish} />);
    await userEvent.type(screen.getByLabelText('Full name'), 'Amara{Enter}');
    expect(onFinish).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your first and last name.');
  });

  it('says why when Enter is pressed in the email with a one-word name at sign-up', async () => {
    render(<Live email="amara@example.com" fullName="Amara" />);
    await userEvent.type(screen.getByLabelText('Email'), '{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your first and last name.');
  });

  it('makes the form inert while the page redirects', () => {
    const { container } = render(<SignInForm {...props({ ...code, redirecting: true })} />);
    expect(container.querySelector('form')).toHaveAttribute('inert');
  });

  it('lets one way in run at a time, and holds the fields while sending', () => {
    const filled = { email: 'amara@example.com', fullName: 'Amara Okafor' };
    const { rerender } = render(<SignInForm {...props({ ...filled, sending: true })} />);
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDisabled();
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Full name')).toHaveAttribute('readonly');
    rerender(<SignInForm {...props({ ...filled, googleBusy: true })} />);
    expect(sendButton()).toBeDisabled();
  });

  it('ties the send error and the typo hint to the email field', () => {
    render(
      <SignInForm {...props({ mode: 'login', email: 'amara@gmial.com', startError: 'sendFailed' })} />,
    );
    const field = screen.getByLabelText('Email');
    const ids = (field.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids).toHaveLength(2);
    const described = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' | ');
    expect(described).toContain('Did you mean');
    expect(described).toContain('We couldn’t send your code. Check your connection and try again.');
  });

  it('shows a server refusal of the name in place of the live rule', () => {
    render(<SignInForm {...props({ fullName: 'Amara Okafor', nameError: 'Use letters, spaces, hyphens, apostrophes or full stops.' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Use letters, spaces, hyphens');
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('needs no code-step props to render the start step, and hides the role row without roleHref', () => {
    render(
      <SignInForm
        mode="signup"
        role="mentee"
        step="start"
        email=""
        onEmailChange={() => {}}
        fullName=""
        onFullNameChange={() => {}}
        onSendCode={() => {}}
        onGoogle={() => {}}
        switchHref="/login"
      />,
    );
    expect(screen.queryByText(/Join as a mentor/)).not.toBeInTheDocument();
  });
});
