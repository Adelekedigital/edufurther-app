import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { ReminderDialog } from './ReminderDialog';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

const request = () =>
  sampleBookingFor({ side: 'mentee', status: 'pending', startsAt: '2026-10-06T13:30:00Z' });

const dialog = (props: Partial<Parameters<typeof ReminderDialog>[0]> = {}) => {
  const onSend = vi.fn();
  const onClose = vi.fn();
  render(
    <ReminderDialog
      booking={request()}
      timeZone="America/New_York"
      onSend={onSend}
      onClose={onClose}
      {...props}
    />,
  );
  return { onSend, onClose };
};

describe('the reminder dialog', () => {
  it('asks the design’s question and says one reminder per request', () => {
    dialog();
    expect(screen.getByRole('heading', { name: 'Send Amara a reminder?' })).toBeVisible();
    expect(
      screen.getByText(
        'We’ll email it to Amara with your request. You can send one reminder per request.',
      ),
    ).toBeVisible();
  });

  it('starts with the drafted message, naming the day and start in the viewer’s zone', () => {
    dialog();
    expect(screen.getByRole('textbox', { name: 'Reminder message' })).toHaveValue(
      'Hi Amara, just checking in on my request for Tue, Oct 6 at 9:30 am. Does this time still work for you?',
    );
  });

  it('sends what the mentee wrote, trimmed', async () => {
    const { onSend } = dialog();
    const box = screen.getByRole('textbox', { name: 'Reminder message' });
    await userEvent.clear(box);
    await userEvent.type(box, '  Still on for Tuesday?  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send reminder' }));
    expect(onSend).toHaveBeenCalledWith('Still on for Tuesday?');
  });

  it('an empty box isn’t sent: Send says why and focus goes to the box', async () => {
    const { onSend } = dialog();
    const box = screen.getByRole('textbox', { name: 'Reminder message' });
    await userEvent.clear(box);
    await userEvent.click(screen.getByRole('button', { name: 'Send reminder' }));
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Write a message to send.');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    await vi.waitFor(() => expect(box).toHaveFocus());
  });

  it('caps the message at 500 characters, as the API does', () => {
    dialog();
    expect(screen.getByRole('textbox', { name: 'Reminder message' })).toHaveAttribute(
      'maxLength',
      '500',
    );
  });

  it('a refusal stays on screen with the text still typed', async () => {
    dialog({ error: 'This request has closed, so the reminder can’t go.' });
    expect(screen.getByRole('alert')).toHaveTextContent('This request has closed');
    expect(
      (screen.getByRole('textbox', { name: 'Reminder message' }) as HTMLTextAreaElement).value,
    ).toMatch(/^Hi Amara/);
  });

  it('Go back closes, except while the reminder is on its way', async () => {
    const { onClose } = dialog();
    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('nothing closes it mid-send', async () => {
    const { onClose } = dialog({ pending: true });
    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeVisible();
  });
});
