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
const nudge = vi.hoisted(() => ({ busy: false }));
const notePushAskShown = vi.hoisted(() => vi.fn());
vi.mock('@/lib/pwa/installNudge', () => ({
  installNudgeBusy: () => nudge.busy,
  notePushAskShown,
}));

/** A moment, then the short wait before the ask shows. */
/** The wait before the ask, then the nudge rules' import (mocked) it reads. */
const askDelay = () =>
  act(async () => {
    vi.advanceTimersByTime(ASK_DELAY_MS);
    await vi.dynamicImportSettled();
  });

const moment = async (m: 'message' | 'booking') => {
  act(() => notePushMoment(m));
  await askDelay();
};

afterEach(() => vi.useRealTimers());
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  Object.assign(push, { state: 'off', askable: true, busy: false, failure: null });
  push.turnOn.mockReset();
  nudge.busy = false;
});

describe('PushPrompt', () => {
  it('asks nothing until a meaningful moment', async () => {
    render(<PushPrompt userId="u1" />);
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('after a message: the ask, once per device; the tap turns them on', async () => {
    render(<PushPrompt userId="u1" />);
    await moment('message');
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.ask.message);
    fireEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    expect(push.turnOn).toHaveBeenCalledTimes(1);
    await moment('booking');
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('the install nudge took the moment: no ask now, and the device’s one ask is kept', async () => {
    nudge.busy = true;
    render(<PushPrompt userId="u1" />);
    await moment('booking');
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
    expect(notePushAskShown).not.toHaveBeenCalled();
    nudge.busy = false;
    await moment('message');
    expect(screen.getByRole('button', { name: PUSH_COPY.turnOn })).toBeInTheDocument();
    // Shown: the install nudge sits this visit out.
    expect(notePushAskShown).toHaveBeenCalledTimes(1);
  });

  it('never asks when it cannot be offered or the browser was asked', async () => {
    push.askable = false;
    render(<PushPrompt userId="u1" />);
    await moment('booking');
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('says the outcome of the tap', async () => {
    const { rerender } = render(<PushPrompt userId="u1" />);
    await moment('booking');
    fireEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    push.busy = true;
    rerender(<PushPrompt userId="u1" />);
    Object.assign(push, { busy: false, state: 'on', askable: false });
    rerender(<PushPrompt userId="u1" />);
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.on);
  });

  it('a refusal says where to allow them', async () => {
    const { rerender } = render(<PushPrompt userId="u1" />);
    await moment('message');
    fireEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    push.busy = true;
    rerender(<PushPrompt userId="u1" />);
    Object.assign(push, { busy: false, failure: 'blocked' });
    rerender(<PushPrompt userId="u1" />);
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.blocked);
  });

  it('a mentor with bookings on Home or Bookings: asked once push can be offered', async () => {
    push.askable = false;
    const { rerender } = render(<PushPrompt userId="u1" mentorWithBookings />);
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
    push.askable = true;
    rerender(<PushPrompt userId="u1" mentorWithBookings />);
    await askDelay();
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.ask.mentor);
  });

  it('a mentor already asked on this device is not asked again', async () => {
    localStorage.setItem('ef-push-asked', '1');
    render(<PushPrompt userId="u1" mentorWithBookings />);
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('an ask that times out unseen-to-the-end is used up only then; tapped, at once', async () => {
    render(<PushPrompt userId="u1" />);
    await moment('message');
    expect(localStorage.getItem('ef-push-asked')).toBeNull();
    act(() => vi.advanceTimersByTime(15_000));
    expect(localStorage.getItem('ef-push-asked')).toBe('1');
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });

  it('a failed turn-on points to Settings', async () => {
    const { rerender } = render(<PushPrompt userId="u1" />);
    await moment('booking');
    fireEvent.click(screen.getByRole('button', { name: PUSH_COPY.turnOn }));
    push.busy = true;
    rerender(<PushPrompt userId="u1" />);
    Object.assign(push, { busy: false, failure: 'failed' });
    rerender(<PushPrompt userId="u1" />);
    expect(screen.getByRole('status')).toHaveTextContent(PUSH_COPY.failed);
  });

  it('stays while its button has focus, so focus never falls to the page', async () => {
    render(<PushPrompt userId="u1" />);
    await moment('message');
    const button = screen.getByRole('button', { name: PUSH_COPY.turnOn });
    button.focus();
    act(() => vi.advanceTimersByTime(15_000));
    expect(button).toBeInTheDocument();
    expect(button).toHaveFocus();
    button.blur();
    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.queryByRole('button', { name: PUSH_COPY.turnOn })).not.toBeInTheDocument();
  });
});
