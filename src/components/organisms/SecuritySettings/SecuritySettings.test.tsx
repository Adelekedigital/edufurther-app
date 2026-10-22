import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SECURITY_COPY } from '@/lib/copy/settings';
import { supportHref } from '@/lib/utils/mailto';
import { SecuritySettings, type DeleteShell, type SecuritySettingsProps } from './SecuritySettings';

// The page frames it in ModalShell (Escape, focus trap: SecurityPanel.test);
// here a dialog with the shell's title and close.
const renderShell = (s: DeleteShell, body: ReactNode) => (
  <div
    role="alertdialog"
    aria-label={s.title}
    data-tone={s.tone}
    data-icon={s.icon}
    data-mobile={s.mobile}
    aria-describedby={s.describedBy}
  >
    <button type="button" onClick={s.onClose} disabled={s.closeDisabled}>
      Close
    </button>
    {body}
  </div>
);

type Over = Partial<
  Omit<SecuritySettingsProps, 'deleteOpen' | 'onDeleteOpenChange' | 'renderShell'>
>;

function Host(over: Over & { open?: boolean }) {
  const [open, setOpen] = useState(over.open ?? false);
  return (
    <SecuritySettings
      role="mentee"
      name="Amara Okafor"
      email="amara@example.com"
      verified
      provider="email"
      upcomingCount={2}
      requestCount={0}
      deleting={false}
      deleteError={null}
      onDelete={vi.fn()}
      {...over}
      deleteOpen={open}
      onDeleteOpenChange={setOpen}
      renderShell={renderShell}
    />
  );
}

const openDelete = () => userEvent.click(screen.getByRole('button', { name: 'Delete account' }));
const confirmButton = () => screen.getByRole('button', { name: 'Delete my account' });
const field = () => screen.getByLabelText('Type DELETE to confirm');

describe('SecuritySettings', () => {
  it('email code: says the code goes to the email, and nothing about Google', () => {
    render(<Host />);
    expect(screen.getByText('With a 6-digit code sent to amara@example.com.')).toBeInTheDocument();
    expect(screen.queryByText(SECURITY_COPY.alsoCode)).not.toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('Google: names Google, and that the code works too', () => {
    render(<Host provider="google" verified={false} />);
    expect(screen.getByText('With Google (amara@example.com).')).toBeInTheDocument();
    expect(screen.getByText(SECURITY_COPY.alsoCode)).toBeInTheDocument();
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('Contact support opens an email to support with the design’s subject and body', () => {
    render(<Host />);
    const href = screen.getByRole('link', { name: 'Contact support' }).getAttribute('href')!;
    const url = new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('support@edufurther.org');
    expect(url.searchParams.get('subject')).toBe('Account email: please change it (Amara Okafor)');
    expect(url.searchParams.get('body')).toBe(
      [
        'Hi EduFurther team,',
        '',
        'Please change the email on my account.',
        '',
        'New email: ',
        '',
        'Name: Amara Okafor',
        'Account email: amara@example.com',
        'Role: Mentee',
        '',
        'Thanks,',
        'Amara',
      ].join('\r\n'),
    );
    // Encoded, not raw: spaces and line breaks can't break the link.
    expect(href).not.toMatch(/\s/);
    expect(
      supportHref(
        { name: '', email: 'x@y.co', mentor: true },
        { subject: SECURITY_COPY.supportSubject, body: SECURITY_COPY.supportBody },
      ),
    ).toContain(encodeURIComponent('Role: Mentor'));
  });

  it('mentor copy points at Busy instead', () => {
    render(<Host role="mentor" />);
    expect(screen.getByRole('link', { name: 'Set yourself as busy' })).toHaveAttribute(
      'href',
      '/calendar',
    );
  });

  it('Delete my account stays off until DELETE is typed (trimmed, exact case)', async () => {
    render(<Host />);
    await openDelete();
    const dialog = screen.getByRole('alertdialog', { name: 'Delete your account?' });
    // A danger confirm with the warning icon, a bottom sheet on phones.
    expect(dialog).toHaveAttribute('data-tone', 'danger');
    expect(dialog).toHaveAttribute('data-icon', 'warning');
    expect(dialog).toHaveAttribute('data-mobile', 'sheet');
    expect(confirmButton()).toBeDisabled();
    await userEvent.type(field(), 'delete');
    expect(confirmButton()).toBeDisabled();
    await userEvent.clear(field());
    await userEvent.type(field(), 'DELET');
    expect(confirmButton()).toBeDisabled();
    await userEvent.clear(field());
    await userEvent.type(field(), '  DELETE ');
    expect(confirmButton()).toBeEnabled();
  });

  it('confirms with the button or Enter, only once DELETE is typed', async () => {
    const onDelete = vi.fn();
    render(<Host onDelete={onDelete} />);
    await openDelete();
    await userEvent.type(field(), 'DELE{Enter}');
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.type(field(), 'TE{Enter}');
    await userEvent.click(confirmButton());
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it.each([
    [0, 0, null],
    [1, 0, 'Your 1 upcoming session will be canceled and your mentor told.'],
    [2, 0, 'Your 2 upcoming sessions will be canceled and the mentor on each told.'],
    [0, 1, 'Your 1 request will be canceled and your mentor told.'],
    [2, 1, 'Your 2 upcoming sessions and 1 request will be canceled and the mentor on each told.'],
  ])('warning with %i upcoming and %i requests', async (n, r, sentence) => {
    render(<Host upcomingCount={n} requestCount={r} />);
    await openDelete();
    const warn = screen.getByText(/hidden right away/);
    if (sentence) expect(warn.textContent).toContain(sentence);
    else expect(warn.textContent).not.toMatch(/upcoming|request/);
    expect(warn.textContent).toContain('unused credits are lost');
  });

  it('mentor warning tells the mentee, and says nothing about credits', () => {
    expect(SECURITY_COPY.deleteWarn(true, 1)).toMatch(
      /^Your 1 upcoming session will be canceled and the mentee told\./,
    );
    expect(SECURITY_COPY.deleteWarn(true, 0)).not.toMatch(/credits|upcoming/);
  });

  it('the confirm is described by its warning', async () => {
    render(<Host upcomingCount={1} />);
    await openDelete();
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      expect.stringMatching(/^Your 1 upcoming session will be canceled/),
    );
  });

  it('while how they log in is read, only that line waits', () => {
    render(<Host provider={null} />);
    expect(screen.getByText('How you log in')).toBeInTheDocument();
    expect(screen.queryByText(/6-digit code|With Google/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
  });

  it('Keep my account and close shut it, and the word starts empty next time', async () => {
    render(<Host />);
    await openDelete();
    await userEvent.type(field(), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: 'Keep my account' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await openDelete();
    expect(field()).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('a failure shows in the confirm, which stays open; deleting holds it', async () => {
    const { rerender } = render(
      <Host open deleteError="We couldn’t delete your account. Nothing has changed. Try again." />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t delete your account.');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    rerender(<Host open deleting />);
    // Read-only, not disabled: a disabled field would drop focus to the page.
    expect(field()).not.toBeDisabled();
    expect(field()).toHaveAttribute('readonly');
    expect(field()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Deleting…' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Keep my account' })).toBeDisabled();
  });
});
