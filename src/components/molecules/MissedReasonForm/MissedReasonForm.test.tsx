import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MISSED_REASON_COPY as C } from '@/lib/copy/session';
import { MissedReasonForm } from './MissedReasonForm';

const form = (over: Partial<Parameters<typeof MissedReasonForm>[0]> = {}) => {
  const onSend = vi.fn();
  render(
    <MissedReasonForm
      question={C.question}
      options={[...C.options]}
      placeholder={C.placeholder}
      sendLabel={C.send}
      thanks={C.thanks}
      noteMax={C.noteMax}
      onSend={onSend}
      sent={false}
      {...over}
    />,
  );
  return onSend;
};

describe('MissedReasonForm', () => {
  it('asks what happened, with the five reasons, and no hint about who reads it', () => {
    form();
    expect(screen.getByRole('form', { name: 'What happened?' })).toBeInTheDocument();
    for (const o of C.options) expect(screen.getByRole('button', { name: o.label })).toBeVisible();
    expect(screen.queryByText(/sees your answer|shared/)).toBeNull();
  });

  it('Send stays off until a chip is picked', async () => {
    const onSend = form();
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox'), 'My laptop died');
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Technical problem' }));
    expect(send).toBeEnabled();
    await userEvent.click(send);
    expect(onSend).toHaveBeenCalledWith({ reason: 'technical', note: 'My laptop died' });
  });

  it('picking the same chip again clears it', async () => {
    form();
    await userEvent.click(screen.getByRole('button', { name: 'Emergency' }));
    await userEvent.click(screen.getByRole('button', { name: 'Emergency' }));
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('the note is optional and trimmed', async () => {
    const onSend = form();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot the time' }));
    await userEvent.type(screen.getByRole('textbox'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledWith({ reason: 'forgot', note: '' });
  });

  it('caps the note at what the backend takes', () => {
    form();
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '1000');
  });

  it('while sending, Send is off so nothing goes twice', async () => {
    const onSend = form({ pending: true });
    await userEvent.click(screen.getByRole('button', { name: 'Other' }));
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('says a failure, and keeps what was picked and typed', async () => {
    form({ error: C.failed });
    expect(screen.getByRole('alert')).toHaveTextContent(C.failed);
  });

  it('shows how much of the note is used, once there is one', async () => {
    form();
    await userEvent.type(screen.getByRole('textbox'), 'abc');
    expect(screen.getByText('3 / 1000')).toBeVisible();
  });

  it('sent from here: focus moves to the thanks line, so it is heard', async () => {
    const onSend = vi.fn();
    const props = {
      question: C.question,
      options: [...C.options],
      placeholder: C.placeholder,
      sendLabel: C.send,
      thanks: C.thanks,
      noteMax: C.noteMax,
      onSend,
    };
    const { rerender } = render(<MissedReasonForm {...props} sent={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Forgot the time' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    rerender(<MissedReasonForm {...props} sent />);
    expect(screen.getByText('Thanks for letting us know.')).toHaveFocus();
  });

  it('sent from elsewhere (another tab) while open here: no focus jump', () => {
    const props = {
      question: C.question,
      options: [...C.options],
      placeholder: C.placeholder,
      sendLabel: C.send,
      thanks: C.thanks,
      noteMax: C.noteMax,
      onSend: vi.fn(),
    };
    const { rerender } = render(<MissedReasonForm {...props} sent={false} />);
    rerender(<MissedReasonForm {...props} sent />);
    expect(screen.getByText('Thanks for letting us know.')).not.toHaveFocus();
  });

  it('already sent when the page loads: the thanks line takes no focus', () => {
    form({ sent: true });
    expect(screen.getByText('Thanks for letting us know.')).not.toHaveFocus();
  });

  it('once sent, the thanks line replaces the form', () => {
    form({ sent: true });
    expect(screen.getByText('Thanks for letting us know.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
  });
});
