import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiError, normaliseError } from '@/lib/api/data/errors';
import { bookingError } from '@/lib/api/data/booking';
import { BookingFlow } from './BookingFlow';
import {
  guestSignIn,
  pinToday,
  props,
  remote,
  setPhone,
  signedIn,
  slots,
} from './BookingFlow.testkit';

pinToday();

/** BookingModal.dc.html round 4: an unfinished mentee's last step (`setupState=unfinished`). */
describe('BookingFlow: finish setup before booking', () => {
  afterEach(() => setPhone(false));

  async function toQuestions() {
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    return user;
  }

  it('offers Finish setup in place of Request on the last step, keeping the answers', async () => {
    const onFinishSetup = vi.fn();
    const onRequest = vi.fn();
    render(<BookingFlow {...props({ setupUnfinished: true, onFinishSetup, onRequest })} />);
    // Not on the time step: Continue as usual.
    expect(screen.queryByRole('region', { name: /Finish setting up/ })).toBeNull();
    const user = await toQuestions();
    await user.type(screen.getByRole('textbox'), 'Choosing between 3 schools');
    expect(screen.queryByRole('button', { name: /^Request/ })).toBeNull();
    const box = screen.getByRole('region', { name: 'Finish setting up to book Olajuwon' });
    expect(box).toHaveTextContent('It’s 2 short steps, then you’ll come back here to confirm.');
    const cta = within(box).getByRole('button', { name: 'Finish setup' });
    expect(cta).toHaveAccessibleDescription(/your first session is free/);
    await user.click(cta);
    expect(onRequest).not.toHaveBeenCalled();
    expect(onFinishSetup).toHaveBeenCalledWith({
      sessionTypeId: 'st1',
      time: '2026-09-28T09:00:00Z',
      answers: { q1: { text: 'Choosing between 3 schools' } },
    });
  });

  it('on phones: the box above a full-width button in the sheet footer', async () => {
    setPhone(true);
    render(<BookingFlow {...props({ setupUnfinished: true, onFinishSetup: vi.fn() })} />);
    await toQuestions();
    const footer = screen.getByTestId('footer');
    expect(within(footer).getByRole('region', { name: /Finish setting up/ })).toBeInTheDocument();
    expect(within(footer).getByRole('button', { name: 'Finish setup' })).toBeInTheDocument();
  });

  it('shows the box when the server says to finish onboarding first, not an error', async () => {
    const refused = bookingError(
      normaliseError(apiError(409, { type: 'https://x/problems/booking-needs-onboarding' })),
    );
    expect(refused.kind).toBe('needsOnboarding');
    render(<BookingFlow {...props({ onFinishSetup: vi.fn(), requestError: refused })} />);
    await toQuestions();
    expect(screen.getByRole('region', { name: /Finish setting up/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a guest signed in to an unfinished account on a session with no questions: the box, not a send', async () => {
    const onRequest = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <BookingFlow
        {...props({ isGuest: true, guest: guestSignIn(), sessionTypeId: 'st2', onRequest })}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    rerender(
      <BookingFlow
        {...props({
          isGuest: false,
          guest: signedIn(),
          sessionTypeId: 'st2',
          onRequest,
          setupUnfinished: true,
          onFinishSetup: vi.fn(),
        })}
      />,
    );
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: /Finish setting up/ })).toBeInTheDocument();
  });

  it('with no way to finish setup here, the refusal is still said', async () => {
    const refused = bookingError(
      normaliseError(apiError(409, { type: 'https://x/problems/booking-needs-onboarding' })),
    );
    render(<BookingFlow {...props({ requestError: refused })} />);
    await toQuestions();
    expect(screen.getByRole('alert')).toHaveTextContent('Finish setting up your account before booking.');
    expect(screen.queryByRole('region', { name: /Finish setting up/ })).toBeNull();
  });

  it('back from onboarding: answers filled in, on the confirm step', () => {
    render(
      <BookingFlow
        {...props({
          initialTime: '2026-09-28T09:00:00Z',
          startAfterTime: true,
          initialAnswers: { q1: { text: 'Kept for you' } },
        })}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('Kept for you');
    expect(screen.getByRole('button', { name: /^Request/ })).toBeEnabled();
  });

  it('back from onboarding with the time gone: the times, saying so', () => {
    // A page stand-in: it owns the offering and serves each one's slots.
    function Page() {
      const [typeId, setTypeId] = useState('st1');
      const byType: Record<string, string[]> = { st1: slots, st2: [] };
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: remote(byType[typeId]!),
            initialTime: '2026-10-02T15:00:00Z',
            startAfterTime: true,
            missedNote: 'That time was just booked. Pick another one. Your answers are saved.',
          })}
        />
      );
    }
    render(<Page />);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'That time was just booked. Pick another one. Your answers are saved.',
    );
  });
});
