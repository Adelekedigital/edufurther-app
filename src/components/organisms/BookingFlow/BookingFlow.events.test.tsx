import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { track } from '@/lib/analytics/track';
import { BookingFlow } from './BookingFlow';
import { pinToday, props, setPhone } from './BookingFlow.testkit';

vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

pinToday();

/** The useOnLeave microtask: an unmount counts once it has run. */
const settle = () => new Promise<void>((r) => setTimeout(r, 0));
const calls = (event: string) => vi.mocked(track).mock.calls.filter(([e]) => e === event);

describe('BookingFlow: the booking funnel (PRD 30)', () => {
  beforeEach(() => {
    setPhone(false);
    vi.mocked(track).mockClear();
  });

  it('starts once on open, StrictMode included, with the surface and whether a guest', async () => {
    render(
      <StrictMode>
        <BookingFlow {...props({ entryPoint: 'home', isGuest: false })} />
      </StrictMode>,
    );
    await settle();
    expect(calls('booking_started')).toEqual([
      ['booking_started', { entry_point: 'home', is_guest: false }],
    ]);
    // StrictMode's unmount-and-remount is no abandon.
    expect(calls('booking_abandoned')).toEqual([]);
  });

  it('counts each step once, requests with the surface, and is not abandoned after', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    const { rerender, unmount } = render(
      <BookingFlow {...props({ entryPoint: 'mentor_profile', onRequest })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    // Back and forward again: the steps already finished don't count twice.
    await user.click(screen.getByRole('button', { name: /^Change/ }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    await user.click(screen.getByRole('button', { name: /^Request Mon, Sep 28/ }));

    expect(calls('booking_step_completed')).toEqual([
      ['booking_step_completed', { step: 'type', entry_point: 'mentor_profile' }],
      ['booking_step_completed', { step: 'time', entry_point: 'mentor_profile' }],
      ['booking_step_completed', { step: 'questions', entry_point: 'mentor_profile' }],
    ]);
    // The request names the surface too, for sessions.entry_point.
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionTypeId: 'st1', entryPoint: 'mentor_profile' }),
    );
    expect(calls('booking_requested')).toEqual([]);

    rerender(
      <BookingFlow {...props({ entryPoint: 'mentor_profile', onRequest, requestDone: true })} />,
    );
    rerender(
      <BookingFlow {...props({ entryPoint: 'mentor_profile', onRequest, requestDone: true })} />,
    );
    expect(calls('booking_requested')).toEqual([
      ['booking_requested', { entry_point: 'mentor_profile', session_type_id: 'st1' }],
    ]);

    unmount();
    await settle();
    expect(calls('booking_abandoned')).toEqual([]);
  });

  it('closed before a request: abandoned once, at the last step finished', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<BookingFlow {...props({ entryPoint: 'explore' })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    unmount();
    await settle();
    expect(calls('booking_abandoned')).toEqual([
      ['booking_abandoned', { entry_point: 'explore', last_step: 'time' }],
    ]);
  });

  it('closed with nothing chosen: abandoned at started; a page hide and the unmount count once', async () => {
    const { unmount } = render(
      <BookingFlow {...props({ entryPoint: 'rebook_after_review', isGuest: true })} />,
    );
    expect(calls('booking_started')).toEqual([
      ['booking_started', { entry_point: 'rebook_after_review', is_guest: true }],
    ]);
    window.dispatchEvent(new Event('pagehide'));
    unmount();
    await settle();
    expect(calls('booking_abandoned')).toEqual([
      ['booking_abandoned', { entry_point: 'rebook_after_review', last_step: 'started' }],
    ]);
  });

  it('a failed request is still abandoned when they give up', async () => {
    const user = userEvent.setup();
    const { rerender, unmount } = render(
      <BookingFlow {...props({ entryPoint: 'explore', sessionTypeId: 'st2' })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Request Mon, Sep 28/ }));
    rerender(
      <BookingFlow
        {...props({
          entryPoint: 'explore',
          sessionTypeId: 'st2',
          requestError: { kind: 'server', message: 'Something went wrong.' },
        })}
      />,
    );
    unmount();
    await settle();
    expect(calls('booking_requested')).toEqual([]);
    expect(calls('booking_abandoned')).toEqual([
      ['booking_abandoned', { entry_point: 'explore', last_step: 'time' }],
    ]);
  });

  it('opened past the time (back from sign-up): the offering and time count as finished', () => {
    render(
      <BookingFlow
        {...props({
          entryPoint: 'onboarding_guest',
          startAfterTime: true,
          initialTime: '2026-09-28T09:00:00Z',
        })}
      />,
    );
    expect(calls('booking_step_completed')).toEqual([
      ['booking_step_completed', { step: 'type', entry_point: 'onboarding_guest' }],
      ['booking_step_completed', { step: 'time', entry_point: 'onboarding_guest' }],
    ]);
  });
});
