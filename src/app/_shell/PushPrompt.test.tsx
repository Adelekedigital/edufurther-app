import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PUSH_COPY } from '@/lib/copy/push';
import { notePushMoment } from '@/lib/utils/push';
import { PushPrompt } from './PushPrompt';

const push = vi.hoisted(() => ({
  state: 'off' as string,
  askable: true,
  busy: false,
  failure: null as null | 'blocked' | 'failed',
  turnOn: vi.fn(),
  turnOff: vi.fn(),
}));
vi.mock('@/lib/api/data/push', () => ({ usePushNotifications: () => push }));

beforeEach(() => {
  localStorage.clear();
  Object.assign(push, { state: 'off', askable: true, busy: false, failure: null });
  push.turnOn.mockReset();
});

describe('PushPrompt', () => {
  it('asks nothing until a meaningful moment', () => {
    render(<PushPrompt userId="u1" />);
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('after a message: the ask, once per device; the tap turns them on', async () => {
    render(<PushPrompt userId="u1" />);
    act(() => notePushMoment('message'));
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.ask.message);
    await userEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    expect(push.turnOn).toHaveBeenCalledTimes(1);
    act(() => notePushMoment('booking'));
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('never asks when it cannot be offered or the browser was asked', () => {
    push.askable = false;
    render(<PushPrompt userId="u1" />);
    act(() => notePushMoment('booking'));
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('says the outcome of the tap', async () => {
    const { rerender } = render(<PushPrompt userId="u1" />);
    act(() => notePushMoment('booking'));
    await userEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    push.busy = true;
    rerender(<PushPrompt userId="u1" />);
    Object.assign(push, { busy: false, state: 'on', askable: false });
    rerender(<PushPrompt userId="u1" />);
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.on);
  });

  it('a refusal says where to allow them', async () => {
    const { rerender } = render(<PushPrompt userId="u1" />);
    act(() => notePushMoment('message'));
    await userEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    push.busy = true;
    rerender(<PushPrompt userId="u1" />);
    Object.assign(push, { busy: false, failure: 'blocked' });
    rerender(<PushPrompt userId="u1" />);
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.blocked);
  });

  it('a mentor with bookings on Home or Bookings: asked once push can be offered', () => {
    push.askable = false;
    const { rerender } = render(<PushPrompt userId="u1" mentorWithBookings />);
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
    push.askable = true;
    rerender(<PushPrompt userId="u1" mentorWithBookings />);
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.ask.mentor);
  });

  it('a mentor already asked on this device is not asked again', () => {
    localStorage.setItem('ef-push-asked', '1');
    render(<PushPrompt userId="u1" mentorWithBookings />);
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });
});
