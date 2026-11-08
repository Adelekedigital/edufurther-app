import { act, fireEvent, render, screen } from '@testing-library/react';

import { PUSH_COPY } from '@/lib/copy/push';
import { notePushMoment } from '@/lib/utils/push';
import { ASK_DELAY_MS, PushPrompt } from './PushPrompt';

const push = vi.hoisted(() => ({
  state: 'off' as string,
  askable: true,
  busy: false,
  failure: null as null | 'blocked' | 'failed',
  turnOn: vi.fn(),
  turnOff: vi.fn(),
}));
vi.mock('@/lib/api/data/push', () => ({ usePushNotifications: () => push }));

/** A moment, then the short wait before the ask shows. */
const moment = (m: 'message' | 'booking') => {
  act(() => notePushMoment(m));
  act(() => vi.advanceTimersByTime(ASK_DELAY_MS));
};

afterEach(() => vi.useRealTimers());
beforeEach(() => {
  vi.useFakeTimers();
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
    moment('message');
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.ask.message);
    fireEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    expect(push.turnOn).toHaveBeenCalledTimes(1);
    moment('booking');
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('never asks when it cannot be offered or the browser was asked', () => {
    push.askable = false;
    render(<PushPrompt userId="u1" />);
    moment('booking');
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('says the outcome of the tap', async () => {
    const { rerender } = render(<PushPrompt userId="u1" />);
    moment('booking');
    fireEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    push.busy = true;
    rerender(<PushPrompt userId="u1" />);
    Object.assign(push, { busy: false, state: 'on', askable: false });
    rerender(<PushPrompt userId="u1" />);
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.on);
  });

  it('a refusal says where to allow them', async () => {
    const { rerender } = render(<PushPrompt userId="u1" />);
    moment('message');
    fireEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
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
    act(() => vi.advanceTimersByTime(ASK_DELAY_MS));
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.ask.mentor);
  });

  it('a mentor already asked on this device is not asked again', () => {
    localStorage.setItem('ef-push-asked', '1');
    render(<PushPrompt userId="u1" mentorWithBookings />);
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('an ask that times out unseen-to-the-end is used up only then; tapped, at once', () => {
    render(<PushPrompt userId="u1" />);
    moment('message');
    expect(localStorage.getItem('ef-push-asked')).toBeNull();
    act(() => vi.advanceTimersByTime(15_000));
    expect(localStorage.getItem('ef-push-asked')).toBe('1');
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('a failed turn-on points to Settings', async () => {
    const { rerender } = render(<PushPrompt userId="u1" />);
    moment('booking');
    fireEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    push.busy = true;
    rerender(<PushPrompt userId="u1" />);
    Object.assign(push, { busy: false, failure: 'failed' });
    rerender(<PushPrompt userId="u1" />);
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.failed);
  });
});
